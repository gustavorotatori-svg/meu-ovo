import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, CheckCircle, Zap, Heart, UtensilsCrossed, Plus, Smartphone, TrendingUp, Star, QrCode, Trophy, Shield, ChevronLeft, ChevronRight, Quote } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/Logo';
import OptimizedImage from '../components/OptimizedImage';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect } from 'react';

export default function LandingPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [direction, setDirection] = useState(0); // -1 for left, 1 for right

  const testimonials = [
    {
      name: 'João da Silva',
      restaurant: 'Pizzaria do João',
      location: 'Vila Mariana, SP',
      initial: 'J',
      tag: 'Pizzaria • Economia Operacional',
      text: 'Antes eu pagava quase 30% de comissão por cada pizza vendida para os grandes aplicativos. Agora o pedido vai direto pro meu WhatsApp e controlo tudo com as telas do Meu Ovo. Minha margem dobrou e comprei um forno de esteira novo!',
      saving: 'R$ 4.200/mês economizados',
      image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=150&h=150&fit=crop'
    },
    {
      name: 'Dona Ana Rosa',
      restaurant: 'Marmita da Dona Ana',
      location: 'Sé, Centro Histórico',
      initial: 'A',
      tag: 'Cozinha Brasileira • Flexibilidade das Vendas',
      text: 'Meus clientes adoraram o cardápio por QR Code nas mesas e no WhatsApp. Fica rolando compartilhamentos no condomínio aqui do lado e eu não preciso mais fazer listas complicadas de preço no Word. Minhas vendas cresceram 45%!',
      saving: 'R$ 2.800/mês economizados',
      image: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?w=150&h=150&fit=crop'
    },
    {
      name: 'Carlos Pinheiro',
      restaurant: 'Burger da Praça',
      location: 'Pinheiros, SP',
      initial: 'C',
      tag: 'Hamburgueria • Agilidade Interna',
      text: 'Muito simples e prático de usar. A funcionalidade do QR Code nas mesas tirou o peso sobre a comissão das plataformas. Economizamos muito com a agilidade operacional nos dias de movimento. O cliente pede e o garçom foca na chapa!',
      saving: 'R$ 3.500/mês economizados',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop'
    },
    {
      name: 'Roberto Hayashi',
      restaurant: 'Sushi Santo Amaro',
      location: 'Santo Amaro, SP',
      initial: 'R',
      tag: 'Sushi • Logística Precisa',
      text: 'Buscávamos uma solução sem segredos. A integração do painel de entregadores por bairro de São Paulo é espetacular. Nossos motoboys recebem as corridas certas e as queixas de atrasos despencaram. E o imposto sobre taxas virou zero!',
      saving: 'R$ 5.100/mês economizados',
      image: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?w=150&h=150&fit=crop'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      handleNext();
    }, 6000);
    return () => clearInterval(timer);
  }, [currentTestimonial]);

  const handleNext = () => {
    setDirection(1);
    setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
  };

  const handlePrev = () => {
    setDirection(-1);
    setCurrentTestimonial(prev => (prev - 1 + testimonials.length) % testimonials.length);
  };

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-black' : 'bg-white'}`}>
      <SEO 
        title="Cardápio Digital Grátis para Restaurantes"
        description="Aumente suas vendas com cardápio digital por QR Code e delivery sem taxas. Receba pedidos direto no seu WhatsApp."
      />
      <Navbar />

      {/* Hero Section */}
      <section className={`pt-32 lg:pt-48 pb-20 px-4 overflow-hidden transition-colors ${
        isDark 
          ? 'bg-gradient-to-b from-[#0e0e11] to-black' 
          : 'bg-gradient-to-b from-gray-50 to-white'
      }`}>
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <div className="text-left">
            <div className="inline-block bg-[#FFC928] text-[#111] text-[10px] lg:text-xs font-black px-4 py-2 rounded-lg mb-8 lg:mb-12 uppercase tracking-widest font-display">
              {t('landing.freeBadge')}
            </div>
            <h1 className={`text-5xl md:text-7xl lg:text-8xl font-display font-black mb-8 leading-[0.95] tracking-tight transition-colors ${isDark ? 'text-white' : 'text-[#111111]'}`}>
              {t('landing.heroTitle')}<br />
              <span className="text-[#FFC928]">{t('landing.heroTitleHighlight')}</span><br />
              {t('landing.heroTitleSuffix')}
            </h1>
            <p className={`max-w-xl text-lg lg:text-xl mb-10 font-display font-semibold leading-relaxed tracking-tight transition-colors ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t('landing.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4">
              <Link
                to="/cadastro-restaurante"
                className="w-full sm:w-auto bg-[#FFC928] text-[#111] font-display font-black px-10 py-5 rounded-3xl text-lg hover:bg-[#e6b520] transition-all hover:scale-[1.02] active:scale-95 text-center shadow-xl shadow-[#FFC928]/10"
              >
                {t('landing.createMenu')}
              </Link>
              <Link
                to="/busca"
                className={`w-full sm:w-auto border-2 font-display font-black px-10 py-5 rounded-3xl text-lg transition-all hover:bg-white/5 active:scale-95 text-center ${isDark ? 'border-white text-white' : 'border-[#111111] text-[#111111]'}`}
              >
                {t('landing.viewDemo')}
              </Link>
            </div>

            <div className="mt-12 flex items-center gap-4">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="w-8 h-8 rounded-full border-2 border-black bg-gray-800 flex items-center justify-center text-[10px] font-black text-[#FFC928]">
                    {i}
                  </div>
                ))}
              </div>
              <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className={isDark ? 'text-white' : 'text-black'}>{t('landing.activeRestaurants')}</span>
              </p>
            </div>
          </div>

          {/* Visual Mockup */}
          <div className="relative group perspective-1000 hidden lg:block">
            <div className="relative transform rotate-y-[-12deg] rotate-x-[8deg] transition-all duration-700 group-hover:rotate-y-[-5deg] group-hover:rotate-x-[2deg]">
              {/* Phone Frame */}
              <div className="w-[320px] bg-[#1a1a1a] rounded-[3.5rem] p-4 shadow-2xl border-4 border-gray-800/50 relative">
                {/* Screen Content */}
                <div className="bg-[#111111] h-[600px] rounded-[2.5rem] overflow-hidden flex flex-col relative border border-white/5">
                  {/* Status Bar */}
                  <div className="p-6 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <OptimizedImage
                        src="https://images.pexels.com/photos/1653877/pexels-photo-1653877.jpeg"
                        alt="Restaurant Logo"
                        width={40}
                        height={40}
                        className="w-10 h-10 rounded-full"
                      />
                      <div>
                        <div className="text-white text-sm font-bold">Pizzaria do João</div>
                        <div className="text-green-500 text-[10px] font-black uppercase">{t('restaurant.openNow')}</div>
                      </div>
                    </div>
                  </div>

                  {/* Scrollable Content */}
                  <div className="flex-1 p-4 space-y-4">
                    {[
                      { name: 'Pizza Calabresa', price: '49,90', img: 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg' },
                      { name: 'Burger de Angus', price: '38,00', img: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg' },
                      { name: 'Batata Rústica', price: '22,00', img: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg' }
                    ].map((item, i) => (
                      <div key={i} className="bg-[#1a1a1a] p-3 rounded-2xl flex gap-3 border border-white/5">
                        <OptimizedImage
                          src={item.img}
                          alt={item.name}
                          width={80}
                          height={80}
                          className="w-20 h-20 rounded-xl"
                        />
                        <div className="flex-1 space-y-2">
                          <div className="text-white text-xs font-bold">{item.name}</div>
                          <div className="text-gray-500 text-[10px] line-clamp-1">Ingredientes frescos selecionados.</div>
                          <div className="flex items-center justify-between pt-2">
                            <span className="text-white font-bold text-xs">R$ {item.price}</span>
                            <div className="w-6 h-6 bg-[#FFC928] rounded-lg flex items-center justify-center">
                              <Plus size={14} className="text-black" />
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Checkout Bar */}
                  <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <button className="w-full bg-[#FFC928] text-black font-black py-4 rounded-xl text-sm shadow-xl">
                      Finalizar pedido
                    </button>
                  </div>

                  {/* "Zero comissão" tag in mockup */}
                  <div className="absolute top-10 right-[-10px] bg-[#FFC928] text-black text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg rotate-12">
                    Zero comissão
                  </div>
                </div>
              </div>
              
              {/* Extra Floating elements */}
              <div className="absolute -left-12 top-1/4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl animate-float">
                <CheckCircle className="text-[#FFC928] mb-2" size={24} />
                <div className="text-white font-bold text-sm">Entrega VIP</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Ticker */}
      <div className="bg-[#FFC928] py-4 overflow-hidden whitespace-nowrap border-y-4 border-black">
        <div className="inline-block animate-marquee-slow">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className="text-black font-black text-xl lg:text-2xl mx-10 uppercase italic tracking-tighter">
              AQUI É COMIDA DE VERDADE. NÃO FOODZINHO. •
            </span>
          ))}
        </div>
        <div className="inline-block animate-marquee-slow">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className="text-black font-black text-xl lg:text-2xl mx-10 uppercase italic tracking-tighter">
              AQUI É COMIDA DE VERDADE. NÃO FOODZINHO. •
            </span>
          ))}
        </div>
      </div>

      {/* Intro Section */}
      <section className={`py-32 transition-colors ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F5F5F5]'}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className={`text-4xl md:text-6xl font-display font-black mb-6 leading-tight transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>
            Seu pedido. Seu restaurante.<br />
            <span className="text-[#FF7A00]">Zero Taxa.</span>
          </h2>
          <p className={`text-lg lg:text-xl max-w-2xl mx-auto font-display font-semibold tracking-tight transition-colors ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>
            Tecnologia que não come sua margem. Tudo que você precisa para vender mais.
          </p>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-20">
            <div className={`p-8 rounded-[2.5rem] text-left transition-all hover:shadow-2xl ${isDark ? 'bg-[#151515] border border-white/5' : 'bg-white'}`}>
              <div className="w-12 h-12 bg-white rounded-xl shadow-inner border border-gray-100 flex items-center justify-center mb-6">
                <CheckCircle className="text-[#FFC928]" size={24} />
              </div>
              <h3 className={`text-2xl font-display font-black mb-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>100% Gratuito</h3>
              <p className={`font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Sem mensalidade, Zero Taxa de setup e sem comissão por pedido. Para sempre.
              </p>
            </div>

            <div className={`p-8 rounded-[2.5rem] text-left transition-all hover:shadow-2xl ${isDark ? 'bg-[#151515] border border-white/5' : 'bg-white'}`}>
              <div className="w-12 h-12 bg-white rounded-xl shadow-inner border border-gray-100 flex items-center justify-center mb-6">
                <Zap className="text-[#FF7A00]" size={24} />
              </div>
              <h3 className={`text-2xl font-display font-black mb-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>Link próprio</h3>
              <p className={`font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Compartilhe seu cardápio pelo WhatsApp e Instagram em segundos.
              </p>
            </div>

            <div className={`p-8 rounded-[2.5rem] text-left transition-all hover:shadow-2xl ${isDark ? 'bg-[#151515] border border-white/5' : 'bg-white'}`}>
              <div className="w-12 h-12 bg-white rounded-xl shadow-inner border border-gray-100 flex items-center justify-center mb-6 text-[#FFC928]">
                <QrCode size={24} />
              </div>
              <h3 className={`text-2xl font-display font-black mb-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('landing.qrCodeTitle')}</h3>
              <p className={`font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                {t('landing.qrCodeDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Secondary Features Section */}
      <section className={`py-16 transition-colors ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className={`p-8 rounded-[2.5rem] text-left hover:shadow-xl transition-all group ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F9F9F9]'}`}>
              <div className="w-12 h-12 mb-6 group-hover:scale-110 transition-transform">
                <Smartphone className="text-[#FFC928]" size={32} />
              </div>
              <h3 className={`text-2xl font-black mb-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('landing.deliveryTitle')}</h3>
              <p className={`font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {t('landing.deliveryDesc')}
              </p>
            </div>

            <div className={`p-8 rounded-[2.5rem] text-left hover:shadow-xl transition-all group ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F9F9F9]'}`}>
              <div className="w-12 h-12 mb-6 group-hover:scale-110 transition-transform">
                <TrendingUp className="text-[#FFC928]" size={32} />
              </div>
              <h3 className={`text-2xl font-black mb-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('landing.dashboardTitle')}</h3>
              <p className={`font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {t('landing.dashboardDesc')}
              </p>
            </div>

            <div className={`p-8 rounded-[2.5rem] text-left hover:shadow-xl transition-all group ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F9F9F9]'}`}>
              <div className="w-12 h-12 mb-6 group-hover:scale-110 transition-transform">
                <Heart className="text-[#FFC928]" size={32} />
              </div>
              <h3 className={`text-2xl font-black mb-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('landing.socialTitle')}</h3>
              <p className={`font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>
                {t('landing.socialDesc')}
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Ovos de Ouro Competition Introduction Banner */}
      <section className={`py-24 border-y transition-colors ${isDark ? 'bg-zinc-950/40 border-white/5' : 'bg-amber-50/40 border-amber-100'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <div className="bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#121212] border border-[#FFC928]/30 rounded-[3rem] p-8 md:p-16 relative overflow-hidden text-left shadow-2xl text-white">
            <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC928]/5 rounded-full blur-3xl -z-1" />
            
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-10 items-center relative z-10">
              <div className="lg:col-span-2 space-y-4">
                <div className="inline-flex items-center gap-2 bg-[#FFC928]/20 border border-[#FFC928]/35 px-3.5 py-1 rounded-full text-[10px] font-black text-[#FFC928] uppercase tracking-wider leading-none">
                  🏆 Competição Anual Meu Ovo
                </div>
                <h2 className="text-3xl md:text-5xl font-display font-black leading-none uppercase italic tracking-tighter">
                  Prêmio Ovos de Ouro
                </h2>
                <p className="text-gray-400 font-medium text-sm md:text-base max-w-xl leading-relaxed">
                  Buscamos o melhor sabor de São Paulo com integridade total. No Meu OVO, as avaliações acumuladas do campeonato são sigilosas e privadas. Apenas os 3 melhores de cada ano são revelados de forma triunfal.
                </p>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
                  <div className="flex items-center gap-2.5">
                    <Shield className="text-[#FFC928]" size={18} />
                    <span className="text-xs text-gray-300 font-bold uppercase tracking-tight">Sigilo absoluto das notas</span>
                  </div>
                  <div className="flex items-center gap-2.5">
                    <Trophy className="text-[#FFC928]" size={18} />
                    <span className="text-xs text-gray-300 font-bold uppercase tracking-tight">Divulgação estrita (Top 3)</span>
                  </div>
                </div>
              </div>
              <div className="lg:col-span-1 flex flex-col sm:flex-row lg:flex-col gap-4 justify-end">
                <Link
                  to="/ovos-de-ouro"
                  className="bg-[#FFC928] text-[#111] hover:bg-[#e6b520] font-black text-xs uppercase tracking-widest px-8 py-5 rounded-[1.5rem] transition-all text-center flex items-center justify-center gap-2"
                >
                  <span>Conhecer Regras</span>
                  <ArrowRight size={14} />
                </Link>
                <Link
                  to="/cadastro-restaurante"
                  className="bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-xs uppercase tracking-widest px-8 py-5 rounded-[1.5rem] transition-all text-center"
                >
                  Participar Gratuitamente
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it Works Section */}
      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-6">{t('landing.howItWorksTitle')}</h2>
          <p className="text-gray-400 text-lg lg:text-xl mb-20 font-display font-semibold tracking-tight">{t('landing.howItWorksSubtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-12 relative">
            {/* Step Lines (Desktop) */}
            <div className="hidden md:block absolute top-[60px] left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-gray-800" />

            {[
              { id: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
              { id: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
              { id: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
              { id: '04', title: t('landing.step4Title'), desc: t('landing.step4Desc') }
            ].map((step, i) => (
              <div key={i} className="relative z-10 flex flex-col items-center">
                <div className="w-20 h-20 bg-[#FFC928] rounded-[1.5rem] flex items-center justify-center text-2xl font-display font-black text-black mb-8 shadow-xl shadow-[#FFC928]/10 group-hover:scale-110 transition-transform">
                  {step.id}
                </div>
                <h3 className="text-xl font-display font-black text-white mb-4">{step.title}</h3>
                <p className="text-gray-500 text-sm font-medium leading-relaxed">{step.desc}</p>
              </div>
            ))}
          </div>

          <div className="mt-20">
            <Link
              to="/cadastro-restaurante"
              className="inline-flex items-center gap-3 bg-[#FFC928] text-[#111] font-display font-black px-12 py-6 rounded-[2rem] text-2xl hover:bg-[#e6b520] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#FFC928]/20"
            >
              {t('landing.startNow')} <ArrowRight size={28} />
            </Link>
          </div>
        </div>
      </section>

      {/* Testimonials Carousel */}
      <section className={`py-32 transition-colors overflow-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-5xl mx-auto px-6">
          <div className="text-center mb-16 space-y-3">
            <span className="text-xs font-black uppercase tracking-[0.2em] text-[#FFC928]">Quem usa, comprova</span>
            <h2 className={`text-3xl md:text-5xl font-display font-black leading-none uppercase italic tracking-tighter transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>
              Histórias de Sucesso Parceiras
            </h2>
            <p className="text-xs sm:text-sm text-gray-400 font-semibold max-w-md mx-auto">Relatos reais de quem assumiu as rédeas do próprio delivery com taxa zero</p>
          </div>

          <div className="relative min-h-[440px] sm:min-h-[340px] md:min-h-[290px] flex flex-col justify-center">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentTestimonial}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction < 0 ? 80 : -80 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                className={`p-8 md:p-12 rounded-[2.5rem] border shadow-xl flex flex-col md:flex-row gap-8 items-center justify-between text-left ${
                  isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-gray-50/55 border-gray-100'
                }`}
              >
                {/* Text Content */}
                <div className="flex-1 space-y-6 relative">
                  <div className="absolute -top-6 -left-6 opacity-5 text-[#FFC928]">
                    <Quote size={80} />
                  </div>
                  
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <div className="flex gap-0.5">
                      {[1, 2, 3, 4, 5].map(s => (
                        <Star key={s} size={14} className="fill-[#FFC928] text-[#FFC928]" />
                      ))}
                    </div>
                    <span className="text-[10px] bg-[#FFC928]/10 text-[#FFC928] font-black uppercase px-2.5 py-0.5 rounded ml-2">
                      {testimonials[currentTestimonial].tag}
                    </span>
                  </div>

                  <p className={`text-base sm:text-lg md:text-xl font-display font-semibold italic leading-relaxed tracking-tight transition-colors ${
                    isDark ? 'text-gray-200' : 'text-[#222]'
                  }`}>
                    "{testimonials[currentTestimonial].text}"
                  </p>

                  <div className="pt-2">
                    <h4 className={`font-black text-sm uppercase transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>
                      {testimonials[currentTestimonial].name}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                      {testimonials[currentTestimonial].restaurant} — <span className="text-[#FFC928]">{testimonials[currentTestimonial].location}</span>
                    </p>
                  </div>
                </div>

                {/* Right highlight Box with Photo & saving badge */}
                <div className="flex flex-col items-center justify-center space-y-4 bg-amber-400/5 dark:bg-amber-400/[0.02] border border-amber-400/10 p-6 rounded-[2rem] w-full md:w-64 flex-shrink-0 text-center">
                  <div className="relative">
                    <OptimizedImage
                      src={testimonials[currentTestimonial].image}
                      alt={testimonials[currentTestimonial].restaurant}
                      width={80}
                      height={80}
                      className="w-20 h-20 rounded-full object-cover border-2 border-[#FFC928] shadow-md"
                    />
                    <div className="absolute bottom-0 right-0 w-6 h-6 bg-[#FFC928] text-black text-xs font-black rounded-full flex items-center justify-center">
                      🍳
                    </div>
                  </div>
                  
                  <div className="space-y-1">
                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-wider">Resultado na conta</div>
                    <div className="text-xs sm:text-sm font-black text-emerald-500 uppercase tracking-tight">
                      {testimonials[currentTestimonial].saving}
                    </div>
                  </div>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Navigation Controls */}
          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setDirection(idx > currentTestimonial ? 1 : -1);
                    setCurrentTestimonial(idx);
                  }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentTestimonial ? 'w-8 bg-[#FFC928]' : 'w-2 bg-gray-300 dark:bg-zinc-800'
                  }`}
                  aria-label={`Ir para slide ${idx + 1}`}
                />
              ))}
            </div>

            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                className={`p-3 rounded-xl border border-gray-150 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors ${
                  isDark ? 'text-white' : 'text-[#111]'
                }`}
                aria-label="Depoimento Anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className={`p-3 rounded-xl border border-gray-150 dark:border-white/5 hover:bg-gray-100 dark:hover:bg-zinc-900 transition-colors ${
                  isDark ? 'text-white' : 'text-[#111]'
                }`}
                aria-label="Próximo Depoimento"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-4xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-7xl font-display font-black text-white mb-6">
            O cliente é seu.<br />
            <span className="text-[#FFC928]">O pedido também.</span>
          </h2>
          <p className="text-gray-400 text-lg lg:text-xl mb-12 font-display font-semibold tracking-tight">
            Zero Taxa. Mais comida de verdade. Comece hoje mesmo.
          </p>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
            <Link
              to="/cadastro-restaurante"
              className="w-full sm:w-auto bg-[#FFC928] text-[#111] font-display font-black px-12 py-6 rounded-[2rem] text-xl hover:bg-[#e6b520] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#FFC928]/20 flex items-center justify-center gap-3"
            >
              Criar meu cardápio grátis <ArrowRight size={24} />
            </Link>
            <Link
              to="/busca"
              className="w-full sm:w-auto border-2 border-white/20 text-white font-display font-black px-12 py-6 rounded-[2rem] text-xl hover:bg-white/5 transition-all text-center"
            >
              Buscar restaurantes
            </Link>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
