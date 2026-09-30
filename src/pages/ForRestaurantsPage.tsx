import { Link } from 'react-router-dom';
import { CheckCircle, ArrowRight, Zap, QrCode, BarChart2, Smartphone, Heart, ShoppingBag, Trophy, Shield, Star, CheckCircle2, Sticker, ChefHat, Package, ClipboardList, Gift, Ticket, Flame, Bell, X } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import ScrollReveal from '../components/ScrollReveal';
import { useTranslation, Trans } from 'react-i18next';

export default function ForRestaurantsPage() {
  const { t } = useTranslation();
  return (
    <div className="min-h-screen bg-white for-restaurants-page">
      <SEO 
        title={t('rest.seoTitle')}
        description={t('rest.seoDesc')}
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

      <div className="relative pt-20 pb-24 overflow-hidden bg-[#0A0A0A] border-b border-white/5 font-sans">
        {/* Glowing ambient background colored lights */}
        <div className="absolute top-1/4 left-1/4 -translate-y-1/2 -translate-x-1/2 w-[350px] h-[350px] bg-amber-500 rounded-full blur-[140px] opacity-[0.25] pointer-events-none" />
        <div className="absolute bottom-1/4 right-1/4 translate-y-1/2 translate-x-1/2 w-[300px] h-[300px] bg-rose-500 rounded-full blur-[130px] opacity-[0.18] pointer-events-none" />
        <div className="absolute top-10 right-10 w-[240px] h-[240px] bg-emerald-500 rounded-full blur-[120px] opacity-[0.12] pointer-events-none" />

        {/* Decorative Grid Lines */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#ffffff03_1px,transparent_1px),linear-gradient(to_bottom,#ffffff03_1px,transparent_1px)] bg-[size:32px_32px]" />

        <div className="max-w-7xl mx-auto px-6 relative z-10">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center pt-12 md:pt-16 pb-6">
            {/* Left side column: The High Contrast Copy */}
            <ScrollReveal direction="up" delay={0} className="lg:col-span-7 space-y-6 text-left">
              {/* Colored tag row */}
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-emerald-400 via-emerald-300 to-emerald-400 bg-clip-text text-transparent animate-gradient-shift inline-flex items-center gap-1">
                  <span className="text-emerald-400">✦</span> {t('rest.ebTax')}
                  <span className="hidden sm:inline text-emerald-400/30">•</span>
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest bg-gradient-to-r from-orange-400 via-orange-300 to-orange-400 bg-clip-text text-transparent animate-gradient-shift inline-flex items-center gap-1">
                  <span className="text-orange-400">✦</span> {t('rest.ebPix')}
                </span>
              </div>

              <h1 className="text-4xl sm:text-6xl lg:text-7.5xl font-sans font-black tracking-tighter uppercase italic flex flex-col items-start gap-3 select-none leading-none">
                <span className="inline-block bg-[#FFC928] text-[#111] px-7 py-3 rounded-2xl shadow-xl shadow-[#FFC928]/10 transform hover:rotate-1 transition-transform duration-300">
                  {t('rest.heroA')}
                </span>
                <span className="inline-block bg-[#111] text-white px-5 py-2.5 rounded-2xl border border-white/10 shadow-2xl transform hover:-rotate-1 transition-transform duration-300">
                  {t('rest.heroB')}
                </span>
              </h1>

              {/* Bold Black Panel inside Hero for Contrast */}
              <div className="bg-black/80 border border-white/10 rounded-3xl p-6 shadow-2xl relative overflow-hidden max-w-2xl">
                <div className="absolute top-0 left-0 w-1.5 h-full bg-gradient-to-b from-[#FFC928] to-orange-500" />
                <p className="text-gray-300 text-lg md:text-xl font-bold leading-relaxed">
                  {t('rest.heroPanelA')} <span className="text-[#FFC928] font-black">{t('rest.heroPanelB')}</span>{t('rest.heroPanelC')}
                </p>
              </div>

              {/* Action Buttons with high color contrast */}
              <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 pt-2">
                <Link
                  to="/cadastro"
                  className="inline-flex justify-center items-center gap-2.5 bg-[#FFC928] hover:bg-[#ffe083] text-[#111] font-black px-8 py-4.5 rounded-2xl text-xs uppercase tracking-widest transition-all duration-300 hover:scale-105 active:scale-95 shadow-xl shadow-[#FFC928]/20 group text-center"
                >
                  {t('rest.heroCta1')} <ArrowRight size={15} className="group-hover:translate-x-1.5 transition-transform" />
                </Link>

                <a
                  href="#revolucao"
                  className="inline-flex justify-center items-center gap-2 border-2 border-white/10 hover:border-white/20 bg-white/5 hover:bg-white/10 text-white font-extrabold px-8 py-4.5 rounded-2xl text-xs uppercase tracking-widest transition-all text-center"
                >
                  {t('rest.heroCta2')}
                </a>
              </div>
            </ScrollReveal>

            {/* Right side column: Colorful Interactive Bento Mockup of Restaurant Operations */}
            <ScrollReveal direction="left" delay={150} className="lg:col-span-5 relative mt-8 lg:mt-0">
              {/* Colorful circular highlight ring */}
              <div className="absolute -inset-1 rounded-[2.5rem] bg-gradient-to-r from-[#FFC928] via-emerald-400 to-orange-550 opacity-20 blur-lg" />
              
              {/* High Contrast Black Card with colourful live metrics mockups */}
              <div className="relative bg-[#111] border-2 border-white/15 rounded-[2.5rem] p-7 md:p-8 space-y-6 shadow-2xl overflow-hidden">
                <div className="flex justify-between items-center pb-4 border-b border-white/10">
                  <div className="flex items-center gap-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 animate-pulse" />
                    <div>
                      <h4 className="text-[10px] font-black text-white uppercase tracking-widest">{t('rest.mockKdsTitle')}</h4>
                      <p className="text-[8px] text-[#FFC928] font-black uppercase tracking-wider">{t('rest.mockKdsSub')}</p>
                    </div>
                  </div>
                  <span className="text-[9px] font-black uppercase text-emerald-400 bg-emerald-950 px-2 py-1 rounded-md border border-emerald-500/30">
                    {t('rest.mockSynced')}
                  </span>
                </div>

                {/* Simulated colorful orders list queue */}
                <div className="space-y-3.5">
                  <div className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 transition-all flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-orange-400 bg-orange-950 px-1.5 py-0.5 rounded uppercase">{t('rest.mockPreparing')}</span>
                        <span className="text-[10px] font-bold text-gray-300">#2384 &bull; Carlos M.</span>
                      </div>
                      <p className="text-xs text-white font-bold leading-none">1x Parmegiana + Fritas Rústicas</p>
                    </div>
                    <span className="text-xs font-black text-[#FFC928]">R$ 49,90</span>
                  </div>

                  <div className="bg-white/5 hover:bg-white/10 border border-white/5 rounded-2xl p-4 transition-all flex justify-between items-center">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded uppercase">{t('rest.mockReady')}</span>
                        <span className="text-[10px] font-bold text-gray-300">#2383 &bull; Marina S.</span>
                      </div>
                      <p className="text-xs text-white font-bold leading-none">2x Hambúrguer Artesanal Meu Ovo</p>
                    </div>
                    <span className="text-xs font-black text-emerald-400">R$ 78,00</span>
                  </div>
                </div>

                {/* Colorful dynamic profit indicator card nested in black box */}
                <div className="bg-black/50 border border-emerald-500/20 rounded-2xl p-4 flex items-center justify-between">
                  <div className="space-y-0.5">
                    <span className="text-[8px] font-black text-gray-400 uppercase tracking-widest block">Margem Preservada</span>
                    <span className="text-2xl font-black italic text-emerald-400 leading-none">100% Livre de Taxas</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[8px] font-black text-emerald-400 uppercase tracking-widest block">Economia Estimada</span>
                    <span className="text-xs font-bold text-white bg-emerald-500/10 border border-emerald-500/25 px-2.5 py-1 rounded-xl inline-block mt-0.5">
                      + R$ 2.450 /mês
                    </span>
                  </div>
                </div>
              </div>
            </ScrollReveal>
          </div>
        </div>

      </div>

      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Professional Cardápio Card */}
          <ScrollReveal direction="up" delay={0}>
          <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-gray-100 shadow-2xl shadow-black/5 hover:border-[#FFC928]/30 transition-all group">
            <div className="w-16 h-16 bg-[#F9F9F9] rounded-2xl flex items-center justify-center mb-8 border border-gray-100 shadow-inner group-hover:bg-[#FFC928]/10 transition-colors">
              <ShoppingBag className="text-[#FFC928]" size={32} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-[#111] mb-6 leading-tight">{t('rest.menuCardTitle')}</h2>
            <p className="text-gray-500 text-lg font-medium mb-10 leading-relaxed">
              {t('rest.menuCardDesc')}
            </p>
            
            <ul className="space-y-4">
              {[
                t('rest.menuB1'),
                t('rest.menuB2'),
                t('rest.menuB3'),
                t('rest.menuB4')
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[#111] font-bold">
                  <CheckCircle className="text-green-500" size={20} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          </ScrollReveal>

          {/* WhatsApp Orders Card */}
          <ScrollReveal direction="up" delay={100}>
          <div className="bg-[#111] rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden group">
            <div className="relative z-10">
              <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-[#FFC928]/20 transition-colors">
                <Zap className="text-[#FFC928]" size={32} />
              </div>
              <h2 className="text-3xl lg:text-4xl font-black text-white mb-6 leading-tight">{t('rest.waCardTitle')}</h2>
              <p className="text-gray-400 text-lg font-medium mb-10 leading-relaxed">
                {t('rest.waCardDesc')}
              </p>

              {/* Terminal Mockup */}
              <div className="bg-black/40 rounded-2xl p-6 font-mono text-[11px] lg:text-sm border border-white/5 shadow-inner">
                <div className="flex gap-2 mb-4">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <div className="w-2 h-2 rounded-full bg-yellow-500" />
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                </div>
                <div className="space-y-1">
                  <p className="text-green-500">{t('rest.mockOrderTitle')}</p>
                  <p className="text-white"><span className="text-gray-500">{t('rest.mockCustomer')}</span> João Silva</p>
                  <p className="text-white"><span className="text-gray-500">{t('rest.mockType')}</span> {t('rest.mockDelivery')}</p>
                  <p className="text-white"><span className="text-gray-500">{t('rest.mockAddress')}</span> Rua X, 123</p>
                  <p className="text-green-400 pt-2">1x Pizza Calabresa - R$49,90</p>
                  <p className="text-green-400">1x Coca-Cola 2L - R$12,00</p>
                  <p className="text-yellow-500 font-bold pt-4">{t('rest.mockTotal')} R$67,90</p>
                </div>
              </div>

              {/* Delivery handoff */}
              <div className="mt-6 overflow-hidden rounded-2xl border border-white/10">
                <img
                  src="/images/entrega-motoboy.jpg"
                  alt={t('rest.mockDeliveryAlt')}
                  loading="lazy"
                  className="w-full h-56 lg:h-64 object-cover hover:scale-[1.02] transition-transform duration-700"
                />
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] opacity-5 rounded-full blur-3xl translate-x-20 -translate-y-20" />
          </div>
          </ScrollReveal>

          {/* Etiquetas Inteligentes Card */}
          <ScrollReveal direction="up" delay={200}>
          <div className="bg-white rounded-[3rem] p-10 md:p-16 border border-gray-100 shadow-2xl shadow-black/5 hover:border-[#FFC928]/30 transition-all group">
            <div className="w-16 h-16 bg-[#F9F9F9] rounded-2xl flex items-center justify-center mb-8 border border-gray-100 shadow-inner group-hover:bg-[#FFC928]/10 transition-colors">
              <Sticker className="text-[#FFC928]" size={32} />
            </div>
            <h2 className="text-3xl lg:text-4xl font-black text-[#111] mb-6 leading-tight">{t('rest.labelCardTitle')}</h2>
            <p className="text-gray-500 text-lg font-medium mb-10 leading-relaxed">
              {t('rest.labelCardDesc')}
            </p>

            {/* Label Visual Mockup — like the terminal mockup above */}
            <div className="bg-[#111] rounded-2xl p-6 border border-white/10 shadow-inner mb-8">
              <div className="flex gap-2 mb-4">
                <div className="w-2 h-2 rounded-full bg-red-500" />
                <div className="w-2 h-2 rounded-full bg-yellow-500" />
                <div className="w-2 h-2 rounded-full bg-green-500" />
              </div>
              <div className="bg-white rounded-xl p-4 border-2 border-black max-w-xs mx-auto font-mono text-[10px] leading-tight shadow-lg">
                <div className="text-center border-b border-dashed border-gray-300 pb-2 mb-2">
                  <p className="font-bold text-[11px] uppercase tracking-wider text-gray-700">Restaurante Sabor</p>
                </div>
                <p className="text-center text-sm font-black uppercase tracking-tight text-black mb-3">Bolo de Cenoura</p>
                <div className="border-t border-dashed border-gray-300 pt-2 space-y-1">
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('rest.lblPrep')}</span>
                    <span className="font-bold text-black">20/07/2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('rest.lblExp')}</span>
                    <span className="font-bold text-black">27/07/2026</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-500">{t('rest.lblBatch')}</span>
                    <span className="font-bold text-black">#LOT-0001</span>
                  </div>
                </div>
                <div className="border-t border-dashed border-gray-300 pt-2 mt-2">
                  <p className="text-[8px] font-bold text-gray-500 uppercase tracking-wider mb-1">{t('rest.lblAllergens')}</p>
                  <div className="flex gap-2 text-[11px]">
                    <span>🥚 {t('allergen.gluten')}</span>
                    <span>🥛 {t('allergen.milk')}</span>
                    <span>🌾 {t('allergen.eggs')}</span>
                  </div>
                </div>
                <p className="text-center text-[9px] font-bold text-gray-600 border-t border-dashed border-gray-300 pt-2 mt-2">{t('rest.lblKeep')}</p>
                <p className="text-center text-[7px] text-gray-400 uppercase tracking-wider border-t border-dashed border-gray-300 pt-2 mt-2">{t('rest.lblByMeuOvo')}</p>
              </div>
            </div>

            <ul className="space-y-4">
              {[
                t('rest.labelB1'),
                t('rest.labelB2'),
                t('rest.labelB3'),
                t('rest.labelB4')
              ].map((item, i) => (
                <li key={i} className="flex items-center gap-3 text-[#111] font-bold">
                  <CheckCircle className="text-green-500" size={20} />
                  {item}
                </li>
              ))}
            </ul>
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Mais Funcionalidades */}
      <section className="py-20 bg-[#F9F9F9] border-t border-gray-100/80">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#111]">{t('rest.moreTitle')}</h2>
            <p className="text-gray-500 text-lg font-medium mt-4">{t('rest.moreSub')}</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {[
              { icon: <Package size={28} />, title: t('rest.f1Title'), desc: t('rest.f1Desc'), dark: false },
              { icon: <ClipboardList size={28} />, title: t('rest.f2Title'), desc: t('rest.f2Desc'), dark: false },
              { icon: <Gift size={28} />, title: t('rest.f3Title'), desc: t('rest.f3Desc'), dark: true },
              { icon: <Ticket size={28} />, title: t('rest.f4Title'), desc: t('rest.f4Desc'), dark: true },
              { icon: <Flame size={28} />, title: t('rest.f5Title'), desc: t('rest.f5Desc'), dark: false },
              { icon: <BarChart2 size={28} />, title: t('rest.f6Title'), desc: t('rest.f6Desc'), dark: false },
              { icon: <Bell size={28} />, title: t('rest.f7Title'), desc: t('rest.f7Desc'), dark: true },
            ].map((feat, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 50}>
              <div className={`${feat.dark ? 'bg-[#111] text-white' : 'bg-white text-[#111]'} rounded-3xl p-8 border ${feat.dark ? 'border-white/10' : 'border-gray-100'} shadow-lg shadow-black/5 hover:border-[#FFC928]/30 transition-all group h-full`}>
                <div className={`w-14 h-14 ${feat.dark ? 'bg-white/5 border-white/10' : 'bg-[#F9F9F9] border-gray-100'} rounded-2xl flex items-center justify-center mb-6 border shadow-inner group-hover:bg-[#FFC928]/10 transition-colors`}>
                  <span className="text-[#FFC928]">{feat.icon}</span>
                </div>
                <h3 className="text-xl font-black mb-3 leading-tight">{feat.title}</h3>
                <p className={`text-sm font-medium leading-relaxed ${feat.dark ? 'text-gray-400' : 'text-gray-500'}`}>{feat.desc}</p>
              </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* Transparência de Notas Section */}
      <section id="revolucao" className="py-20 bg-white border-t border-gray-100/80">
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal direction="up" delay={0}>
          <div className="bg-[#111] text-white rounded-[3rem] p-8 md:p-14 relative overflow-hidden shadow-2xl border-2 border-white/10">
            <div className="absolute top-0 right-0 w-80 h-80 bg-amber-500 rounded-full blur-[120px] opacity-10 pointer-events-none" />
            <div className="absolute bottom-0 left-0 w-72 h-72 bg-[#FFC928] rounded-full blur-[100px] opacity-[0.08] pointer-events-none" />
            
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
              <div className="lg:col-span-7 space-y-5">
                <div className="inline-flex items-center gap-2 text-[9px] font-black uppercase tracking-widest leading-none relative">
                  <span className="relative z-10 bg-gradient-to-r from-[#FFC928] via-yellow-200 to-[#FFC928] bg-clip-text text-transparent animate-gradient-shift">{t('rest.revEyebrow')}</span>
                  <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-gradient-to-r from-[#FFC928]/60 via-yellow-300/40 to-[#FFC928]/60 animate-gradient-shift rounded-full" />
                </div>
                <h3 className="text-3xl md:text-5xl font-sans font-black italic uppercase tracking-tighter text-white leading-none">
                  {t('rest.revTitleA')}<br />{t('rest.revTitleB')} <span className="text-[#FFC928]">{t('rest.revTitleC')}</span>
                </h3>
                <p className="text-gray-300 text-sm md:text-base font-medium leading-relaxed">
                  <Trans i18nKey="rest.revDesc">No Meu Ovo, <strong className="text-white">o restaurante dá a nota no cliente</strong>. No momento do pedido, você vê a reputação do cliente e decide se aceita ou não. Cliente difícil fica com nota baixa e você não precisa mais ser refém de avaliações públicas injustas. O restaurante é o grande astro — o cliente é bem-vindo, mas também é avaliado.</Trans>
                </p>
                <div className="p-4 bg-white/5 border border-white/10 rounded-2xl">
                  <p className="text-xs text-gray-400 font-bold uppercase tracking-wider mb-1">{t('rest.revDiffLabel')}</p>
                  <p className="text-[12px] text-[#FFC928] font-semibold leading-relaxed">
                    {t('rest.revDiffText')}
                  </p>
                </div>
              </div>

              <div className="lg:col-span-5 bg-black/50 border-2 border-white/10 rounded-3xl p-6 space-y-4 shadow-xl w-full">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-[#FFC928] text-black font-black text-xs rounded-xl flex items-center justify-center">
                    🍳
                  </div>
                  <div>
                    <h4 className="text-xs font-black text-white uppercase tracking-wider">{t('rest.mockClient')}</h4>
                    <p className="text-[9px] text-gray-500 font-bold uppercase">{t('rest.mockOrders')}</p>
                  </div>
                </div>

                <div className="bg-white/5 border border-white/5 rounded-2xl p-4 text-center space-y-1.5">
                  <span className="text-[8px] font-black text-[#FFC928] uppercase tracking-widest block">{t('rest.mockRatingLabel')}</span>
                  <div className="flex items-center justify-center gap-2">
                    <span className="font-black text-5xl text-white">4.8</span>
                    <div className="flex items-center">
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                      <Star className="size-5 fill-yellow-400 text-yellow-400" />
                    </div>
                  </div>
                  <p className="text-[9px] text-gray-400 font-bold">{t('rest.mockRatingHint')}</p>
                </div>

                <div className="flex items-center justify-center gap-1 text-[9px] text-emerald-400 font-black uppercase tracking-widest">
                  <CheckCircle2 size={10} />
                  <span>{t('rest.mockDecide')}</span>
                </div>
              </div>
            </div>
          </div>
          </ScrollReveal>

          {/* KDS Kitchen Display Card */}
          <ScrollReveal direction="up" delay={300}>
          <div className="bg-[#111] rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden group lg:col-span-2">
            <div className="relative z-10 grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
              <div>
                <div className="w-16 h-16 bg-white/5 rounded-2xl flex items-center justify-center mb-8 border border-white/10 group-hover:bg-[#FFC928]/20 transition-colors">
                  <ChefHat className="text-[#FFC928]" size={32} />
                </div>
                <h2 className="text-3xl lg:text-4xl font-black text-white mb-6 leading-tight">{t('rest.kdsTitle')}</h2>
                <p className="text-gray-400 text-lg font-medium mb-10 leading-relaxed">
                  {t('rest.kdsDesc')}
                </p>

                <ul className="space-y-4">
                  {[
                    t('rest.kdsB1'),
                    t('rest.kdsB2'),
                    t('rest.kdsB3'),
                    t('rest.kdsB4')
                  ].map((item, i) => (
                    <li key={i} className="flex items-center gap-3 text-white font-bold">
                      <CheckCircle className="text-green-500" size={20} />
                      {item}
                    </li>
                  ))}
                </ul>
              </div>

              {/* KDS Mockup */}
              <div className="bg-black/40 rounded-2xl p-6 border border-white/5 shadow-inner">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                     <span className="text-[9px] font-black text-white uppercase tracking-widest">{t('rest.kdsActive')}</span>
                  </div>
                  <span className="text-[8px] font-black text-emerald-400 bg-emerald-950 px-2 py-0.5 rounded border border-emerald-500/30">KDS</span>
                </div>
                <div className="space-y-3">
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black text-orange-400 bg-orange-950 px-1.5 py-0.5 rounded uppercase">{t('rest.kdsPreparing')}</span>
                      <span className="text-[9px] font-black text-orange-400">8'</span>
                    </div>
                    <p className="text-xs text-white font-bold">1x Parmegiana</p>
                    <p className="text-[10px] text-gray-400 mt-1">🥩 Molho → Empanar → Fritar → Queijo → Salada</p>
                  </div>
                  <div className="bg-white/5 border border-white/5 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-2">
                       <span className="text-[9px] font-black text-emerald-400 bg-emerald-950 px-1.5 py-0.5 rounded uppercase">{t('rest.kdsReady')}</span>
                      <span className="text-[9px] font-black text-emerald-400">3'</span>
                    </div>
                    <p className="text-xs text-white font-bold">2x Hambúrguer Artesanal</p>
                    <p className="text-[10px] text-gray-400 mt-1">🥩 Pão → Blend → Queijo → Montagem</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] opacity-5 rounded-full blur-3xl translate-x-20 -translate-y-20" />
          </div>
          </ScrollReveal>
        </div>
      </section>

      {/* Comparativo Meu Ovo vs Grandes Apps */}
      <section className="py-24 bg-white border-t border-gray-100/80">
        <div className="max-w-5xl mx-auto px-4">
          <ScrollReveal direction="up" delay={0}>
            <div className="text-center mb-16">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#FFC928] mb-3 block">{t('rest.cmpEyebrow')}</span>
              <h2 className="text-4xl font-black text-[#111]">{t('rest.cmpTitle')}</h2>
              <p className="text-gray-500 text-lg font-medium mt-4">{t('rest.cmpSub')}</p>
            </div>
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <div className="rounded-[2.5rem] overflow-hidden border border-gray-100 bg-white shadow-2xl shadow-black/5">
              {/* Header */}
              <div className="grid grid-cols-3 gap-0">
                <div className="p-6 md:p-8 bg-gray-50" />
                <div className="p-6 md:p-8 text-center border-x border-gray-100 bg-[#FFF8E1]">
                  <div className="text-xs font-black uppercase tracking-widest text-[#FFC928] mb-1">Meu Ovo</div>
                  <div className="text-[10px] font-bold uppercase text-gray-500">{t('rest.cmpOurs')}</div>
                </div>
                <div className="p-6 md:p-8 text-center bg-gray-100">
                  <div className="text-xs font-black uppercase tracking-widest text-gray-500 mb-1">{t('rest.cmpTheirs')}</div>
                  <div className="text-[10px] font-bold uppercase text-gray-400">{t('rest.cmpMarketplace')}</div>
                </div>
              </div>

              {/* Rows */}
              {[
                { feature: t('rest.rowFee'), meuOvo: '0%', competitor: '12–27%+', highlight: true },
                { feature: t('rest.rowMonthly'), meuOvo: t('rest.freeVal'), competitor: t('rest.variesVal'), highlight: false },
                { feature: t('rest.rowOwner'), meuOvo: true, competitor: false, highlight: true },
                { feature: t('rest.rowRates'), meuOvo: true, competitor: false, highlight: true },
                { feature: t('rest.rowKds'), meuOvo: true, competitor: false, highlight: false },
                { feature: t('rest.rowRecipe'), meuOvo: true, competitor: false, highlight: false },
                { feature: t('rest.rowLoyalty'), meuOvo: true, competitor: false, highlight: false },
                { feature: t('rest.rowCoupons'), meuOvo: true, competitor: false, highlight: false },
                { feature: t('rest.rowFlash'), meuOvo: true, competitor: false, highlight: false },
                { feature: t('rest.rowQr'), meuOvo: true, competitor: false, highlight: false },
                { feature: t('rest.rowDonate'), meuOvo: true, competitor: false, highlight: false },
                { feature: t('rest.rowSetup'), meuOvo: t('rest.setupFast'), competitor: t('rest.setupSlow'), highlight: false },
                { feature: t('rest.rowData'), meuOvo: true, competitor: false, highlight: true },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 gap-0 border-t border-gray-100 ${row.highlight ? 'bg-[#FFF8E1]/50' : ''}`}>
                  <div className="p-4 md:p-5 flex items-center text-xs md:text-sm font-bold text-gray-700">{row.feature}</div>
                  <div className="p-4 md:p-5 flex items-center justify-center border-x border-gray-100">
                    {typeof row.meuOvo === 'boolean' ? (
                      <CheckCircle size={18} className="text-emerald-500" />
                    ) : (
                      <span className="text-xs md:text-sm font-black text-[#FFC928]">{row.meuOvo}</span>
                    )}
                  </div>
                  <div className="p-4 md:p-5 flex items-center justify-center">
                    {typeof row.competitor === 'boolean' ? (
                      row.competitor ? <CheckCircle size={18} className="text-emerald-500" /> : <X size={18} className="text-red-400" />
                    ) : (
                      <span className="text-xs md:text-sm font-bold text-gray-400">{row.competitor}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>

          {/* Savings highlight */}
          <ScrollReveal direction="up" delay={200}>
            <div className="mt-12 bg-[#111] rounded-[2rem] p-8 md:p-12 text-center text-white relative overflow-hidden">
              <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] opacity-5 rounded-full blur-3xl translate-x-20 -translate-y-20" />
              <div className="relative z-10">
                <p className="text-gray-400 text-sm font-bold uppercase tracking-widest mb-3">{t('rest.saveEyebrow')}</p>
                <p className="text-4xl md:text-6xl font-black text-[#FFC928] mb-4">{t('rest.saveValue')}</p>
                <p className="text-gray-400 text-sm font-medium max-w-lg mx-auto">
                  <Trans i18nKey="rest.saveText">Se um restaurante fatura R$ 15.000/mês e paga 23% de comissão nos grandes apps de delivery, são <span className="text-white font-bold">R$ 3.450/mês</span> que vão para o bolso do app. No Meu Ovo, essa grana é sua.</Trans>
                </p>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      <section className="py-24 bg-[#F9F9F9]">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl font-black text-[#111]">{t('rest.stepsTitle')}</h2>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <ScrollReveal direction="up" delay={0}>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">01</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">{t('rest.step1Title')}</h3>
              <p className="text-gray-500 text-sm font-medium">{t('rest.step1Desc')}</p>
            </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={100}>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">02</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">{t('rest.step2Title')}</h3>
              <p className="text-gray-500 text-sm font-medium">{t('rest.step2Desc')}</p>
            </div>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={200}>
            <div className="text-center">
              <div className="w-14 h-14 bg-white rounded-2xl flex items-center justify-center font-black text-[#111] text-xl mx-auto mb-6 shadow-md shadow-black/5">03</div>
              <h3 className="text-xl font-black text-[#111] mb-2 uppercase italic tracking-tighter">{t('rest.step3Title')}</h3>
              <p className="text-gray-500 text-sm font-medium">{t('rest.step3Desc')}</p>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      {/* Ovos de Ouro Competition For Restaurants */}
      <section className="py-24 bg-white border-t border-gray-100 text-left">
        <div className="max-w-5xl mx-auto px-6">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12 items-center">
            <ScrollReveal direction="up" delay={0} className="md:col-span-2 space-y-4">
              <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider leading-none relative">
                <span className="relative z-10 bg-gradient-to-r from-amber-500 via-yellow-300 to-amber-500 bg-clip-text text-transparent animate-gradient-shift">{t('rest.ovoBadge', { year: new Date().getFullYear() })}</span>
                <span className="absolute -bottom-1.5 left-0 right-0 h-[3px] bg-gradient-to-r from-amber-500/60 via-yellow-300/50 to-amber-500/60 animate-gradient-shift rounded-full blur-[1px]" />
              </div>
              <h2 className="text-3xl md:text-5xl font-black text-[#111] leading-none uppercase italic tracking-tighter">
                {t('rest.ovoTitleA')}<br />
                <span className="text-[#FFC928]">{t('rest.ovoTitleB')}</span>
              </h2>
              <p className="text-gray-500 text-sm md:text-base font-medium max-w-xl leading-relaxed">
                <Trans i18nKey="rest.ovoDesc">Uma competição justa onde apenas quem realmente comprou e finalizou o pedido pode avaliar seus pratos. Bebidas não entram na disputa. 
                <strong className="text-[#111]">Você não vê as notas</strong> — o ranking é 100% privado, visível apenas para a administração da plataforma. 
                No dia 20 de Dezembro, revelamos os vencedores: Top 3 por tipo de cozinha, Top 3 por bairro e Top 3 por cidade. 
                Os pratos premiados ganham um selo exclusivo para usar durante todo o ano seguinte.</Trans>
              </p>
            </ScrollReveal>
            <ScrollReveal direction="up" delay={100}>
            <div className="md:col-span-1 bg-gradient-to-br from-[#111] to-[#1e1e1e] rounded-[2rem] p-6 text-white border border-[#FFC928]/20 space-y-4">
              <div className="flex items-center gap-2">
                <Trophy className="text-[#FFC928]" size={20} />
                <h4 className="font-extrabold text-[#FFC928] uppercase tracking-wide text-[11px]">{t('rest.ovoBoxTitle')}</h4>
              </div>
              <ul className="space-y-3.5 text-xs text-gray-300 font-semibold list-inside list-disc">
                <li>{t('rest.ovoB1')}</li>
                <li>{t('rest.ovoB2')}</li>
                <li>{t('rest.ovoB3')}</li>
                <li>{t('rest.ovoB4')}</li>
              </ul>
              <Link 
                to="/ovos-de-ouro" 
                className="block text-center bg-[#FFC928] hover:bg-[#e6b520] text-black font-black text-[10px] uppercase tracking-widest py-3 px-4 rounded-xl transition-all"
              >
                {t('rest.ovoCta')}
              </Link>
            </div>
            </ScrollReveal>
          </div>
        </div>
      </section>

      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-3xl mx-auto px-4 text-center">
          <ScrollReveal direction="up" delay={0}>
          <h2 className="text-4xl md:text-6xl font-black text-white mb-6 leading-tight">
            {t('rest.finalA')}<br />
            <span className="text-[#FFC928]">{t('rest.finalB')}</span>
          </h2>
          <p className="text-gray-500 text-xl mb-12 font-medium">{t('rest.finalSub')}</p>
          <Link
            to="/cadastro"
            className="inline-flex items-center gap-3 bg-[#FFC928] text-[#111] font-black px-12 py-6 rounded-2xl text-xl hover:bg-[#e6b520] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#FFC928]/20"
          >
            {t('rest.finalCta')} <ArrowRight size={24} />
          </Link>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
