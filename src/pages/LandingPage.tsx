import { Link } from 'react-router-dom';
import { ArrowRight, CheckCircle, Zap, Heart, Plus, Smartphone, TrendingUp, Star, QrCode, Trophy, Shield, ChevronLeft, ChevronRight, Quote, Egg, Sticker, ChevronDown, Banknote, Clock, Users, TrendingDown, X, Minus } from 'lucide-react';
import ScrollReveal from '../components/ScrollReveal';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SectionHeader from '../components/SectionHeader';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import OptimizedImage from '../components/OptimizedImage';
import { motion, AnimatePresence } from 'motion/react';
import { useState, useEffect, useCallback } from 'react';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

const faqData = [
  {
    q: 'O Meu Ovo realmente é gratuito?',
    a: 'Sim. Sem mensalidade, sem taxa de setup e sem comissão por pedido. O restaurante paga zero para usar a plataforma. Nosso modelo de receita vem de parcerias e serviços premium opcionais.'
  },
  {
    q: 'Como os pedidos chegam no restaurante?',
    a: 'Os pedidos são enviados direto para o WhatsApp do restaurante. Também existe um painel administrativo completo para acompanhar pedidos, relatórios e gerenciar o cardápio em tempo real.'
  },
  {
    q: 'Preciso saber programar para usar?',
    a: 'Não. O cadastro leva menos de 10 minutos. Você adiciona seus produtos, fotos e preços pelo painel administrativo, que é simples e intuitivo. Se precisar de ajuda, nossa equipe acompanha por WhatsApp.'
  },
  {
    q: 'E se eu já uso iFood ou Rappi?',
    a: 'Pode usar os dois ao mesmo tempo. O Meu Ovo não substitui — complementa. Enquanto as plataformas cobram 27-35% de comissão, seus pedidos diretos pelo Meu Ovo saem com taxa zero. É dinheiro que fica no seu bolso.'
  },
  {
    q: 'Meus clientes precisam baixar algum app?',
    a: 'Não. O cardápio é acessado pelo navegador do celular — basta escanear o QR Code ou clicar no link que você compartilhar no WhatsApp, Instagram ou wherever. Nenhum download necessário.'
  },
  {
    q: 'Funciona para delivery, retirada e salão?',
    a: 'Sim. O restaurante escolhe quais modos de pedido aceitar: delivery, retirada, salão (mesa) ou todos. O cliente escolhe no checkout e o pedido chega no WhatsApp com essa informação.'
  },
  {
    q: 'Preciso ter CNPJ?',
    a: 'Não. O cadastro é aberto para qualquer restaurante ou empreendedor de alimentação. Você precisa apenas de um WhatsApp válido para receber os pedidos.'
  },
  {
    q: 'Como funciona a doação no checkout?',
    a: 'O cliente pode adicionar uma doação voluntária ao pedido. 100% do valor arrecadado é repassado a instituições que combatem a fome. O restaurante não paga nada por isso — é um diferencial social da plataforma.'
  }
];

export default function LandingPage() {
  const [liveRestaurantCount, setLiveRestaurantCount] = useState(0);

  useEffect(() => {
    const unsub = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      setLiveRestaurantCount(snapshot.size);
    }, () => {});
    return () => unsub();
  }, []);
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  const [currentTestimonial, setCurrentTestimonial] = useState(0);
  const [direction, setDirection] = useState(0);
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  const testimonials = [
    {
      name: 'João da Silva',
      restaurant: 'Pizzaria do João',
      location: 'Vila Mariana, SP',
      tag: 'Pizzaria • Economia Operacional',
      text: 'Antes eu pagava quase 30% de comissão por cada pizza vendida para os grandes aplicativos. Agora o pedido vai direto pro meu WhatsApp e controlo tudo com as telas do Meu Ovo. Minha margem dobrou e comprei um forno de esteira novo!',
      saving: 'R$ 4.200/mês economizados',
      image: 'https://images.pexels.com/photos/220453/pexels-photo-220453.jpeg?w=150&h=150&fit=crop'
    },
    {
      name: 'Dona Ana Rosa',
      restaurant: 'Marmita da Dona Ana',
      location: 'Sé, Centro Histórico',
      tag: 'Cozinha Brasileira • Flexibilidade',
      text: 'Meus clientes adoraram o cardápio por QR Code nas mesas e no WhatsApp. Fica rolando compartilhamentos no condomínio aqui do lado e eu não preciso mais fazer listas complicadas de preço no Word. Minhas vendas cresceram 45%!',
      saving: 'R$ 2.800/mês economizados',
      image: 'https://images.pexels.com/photos/762020/pexels-photo-762020.jpeg?w=150&h=150&fit=crop'
    },
    {
      name: 'Carlos Pinheiro',
      restaurant: 'Burger da Praça',
      location: 'Pinheiros, SP',
      tag: 'Hamburgueria • Agilidade Interna',
      text: 'Muito simples e prático de usar. A funcionalidade do QR Code nas mesas tirou o peso sobre a comissão das plataformas. Economizamos muito com a agilidade operacional nos dias de movimento. O cliente pede e o garçom foca na chapa!',
      saving: 'R$ 3.500/mês economizados',
      image: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?w=150&h=150&fit=crop'
    },
    {
      name: 'Roberto Hayashi',
      restaurant: 'Sushi Santo Amaro',
      location: 'Santo Amaro, SP',
      tag: 'Sushi • Sem Taxas Abusivas',
      text: 'Buscávamos uma solução sem segredos. O sistema de vendas diretas do Meu Ovo eliminou de vez a dependência de plataformas que cobravam taxas abusivas. O pedido chega limpo no nosso WhatsApp e a margem ficou muito mais saudável.',
      saving: 'R$ 5.100/mês economizados',
      image: 'https://images.pexels.com/photos/91227/pexels-photo-91227.jpeg?w=150&h=150&fit=crop'
    }
  ];

  const handleNext = useCallback(() => {
    setDirection(1);
    setCurrentTestimonial(prev => (prev + 1) % testimonials.length);
  }, [testimonials.length]);

  const handlePrev = useCallback(() => {
    setDirection(-1);
    setCurrentTestimonial(prev => (prev - 1 + testimonials.length) % testimonials.length);
  }, [testimonials.length]);

  useEffect(() => {
    const timer = setInterval(handleNext, 6000);
    return () => clearInterval(timer);
  }, [handleNext]);

  const toggleFaq = (idx: number) => {
    setOpenFaq(prev => prev === idx ? null : idx);
  };

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-black' : 'bg-white'}`}>
      <SEO
        title="Cardápio Digital Grátis para Restaurantes"
        description="Aumente suas vendas com cardápio digital por QR Code e delivery sem taxas. Receba pedidos direto no seu WhatsApp. Cadastro gratuito."
        faqItems={faqData.map(f => ({ question: f.q, answer: f.a }))}
      />
      <Navbar />

      {/* ─── Hero Section ─── */}
      <section className={`pt-32 lg:pt-48 pb-20 px-4 overflow-hidden relative transition-colors ${
        isDark
          ? 'bg-gradient-to-b from-[#0e0e11] to-black'
          : 'bg-gradient-to-b from-gray-50 to-white'
      }`}>
        <div className="absolute inset-0 pointer-events-none overflow-hidden select-none">
          <div className="absolute top-[10%] left-[5%] opacity-[0.04] animate-float" style={{ animationDuration: '7s' }}>
            <Egg size={48} className={isDark ? 'text-white' : 'text-[#FFC928]'} />
          </div>
          <div className="absolute top-[30%] right-[8%] opacity-[0.03] animate-float" style={{ animationDuration: '9s', animationDelay: '2s' }}>
            <Egg size={36} className={isDark ? 'text-white' : 'text-[#FFC928]'} />
          </div>
          <div className="absolute bottom-[15%] left-[12%] opacity-[0.03] animate-drift" style={{ animationDuration: '12s', animationDelay: '1s' }}>
            <Egg size={32} className={isDark ? 'text-white' : 'text-[#FFC928]'} />
          </div>
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-12 lg:gap-20 items-center">
          <ScrollReveal direction="up" delay={0} className="text-left">
            <div className="inline-block bg-[#FFC928] text-[#111] text-[10px] lg:text-xs font-black px-4 py-2 rounded-2xl mb-8 lg:mb-12 uppercase tracking-widest font-display">
              {t('landing.freeBadge')}
            </div>
            <h1 className={`text-4xl sm:text-5xl md:text-7xl lg:text-8xl font-display font-black mb-6 leading-[0.95] tracking-tight transition-colors ${isDark ? 'text-white' : 'text-[#111111]'}`}>
              {t('landing.heroTitle')}<br />
              <span className="text-[#FFC928]">{t('landing.heroTitleHighlight')}</span><br />
              {t('landing.heroTitleSuffix')}
            </h1>
            <p className={`max-w-xl text-base lg:text-lg mb-8 font-display font-semibold leading-relaxed tracking-tight transition-colors ${
              isDark ? 'text-gray-300' : 'text-gray-700'
            }`}>
              {t('landing.heroSubtitle')}
            </p>

            <div className="flex flex-col sm:flex-row items-center gap-4 mb-10">
              <Link
                to="/cadastro"
                className="w-full sm:w-auto bg-[#FFC928] text-[#111] font-display font-black px-10 py-5 rounded-2xl text-lg hover:bg-[#e6b520] transition-all hover:scale-[1.02] active:scale-95 text-center shadow-xl shadow-[#FFC928]/10"
              >
                {t('landing.createMenu')}
              </Link>
              <Link
                to="/busca"
                className={`w-full sm:w-auto border-2 font-display font-black px-10 py-5 rounded-2xl text-lg transition-all hover:bg-white/5 active:scale-95 text-center ${isDark ? 'border-white/20 text-white hover:border-white/40' : 'border-[#111111]/20 text-[#111111] hover:border-[#111111]'}`}
              >
                {t('landing.viewDemo')}
              </Link>
            </div>

            <div className="flex items-center gap-3 flex-wrap">
              <div className="flex -space-x-2">
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className={`w-8 h-8 rounded-full border-2 flex items-center justify-center text-[10px] font-black text-[#FFC928] ${isDark ? 'border-black bg-gray-800' : 'border-white bg-gray-800'}`}>
                    {i}
                  </div>
                ))}
              </div>
              <p className={`text-sm font-bold ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                <span className={isDark ? 'text-white' : 'text-black'}>+{Math.max(liveRestaurantCount, 500)} restaurantes já usam o Meu Ovo</span>
              </p>
              <span className="hidden sm:inline text-[10px] font-bold uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500">
                Grátis para sempre
              </span>
            </div>
          </ScrollReveal>

          {/* Desktop Phone Mockup */}
          <ScrollReveal direction="right" delay={150} className="relative group perspective-1000 hidden lg:block">
            <div className="relative transform rotate-y-[-12deg] rotate-x-[8deg] transition-all duration-700 group-hover:rotate-y-[-5deg] group-hover:rotate-x-[2deg]">
              <div className="w-[320px] bg-[#1a1a1a] rounded-[3.5rem] p-4 shadow-2xl border-4 border-gray-800/50 relative">
                <div className="bg-[#111111] h-[600px] rounded-[2.5rem] overflow-hidden flex flex-col relative border border-white/5">
                  <div className="p-6 pb-2 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <OptimizedImage src="https://images.pexels.com/photos/1653877/pexels-photo-1653877.jpeg" alt="Restaurante" width={40} height={40} className="w-10 h-10 rounded-full" />
                      <div>
                        <div className="text-white text-sm font-bold">Pizzaria do João</div>
                        <div className="text-green-500 text-[10px] font-black uppercase">{t('restaurant.openNow')}</div>
                      </div>
                    </div>
                  </div>
                  <div className="flex-1 p-4 space-y-4">
                    {[
                      { name: 'Pizza Calabresa', price: '49,90', img: 'https://images.pexels.com/photos/2147491/pexels-photo-2147491.jpeg' },
                      { name: 'Burger de Angus', price: '38,00', img: 'https://images.pexels.com/photos/1639557/pexels-photo-1639557.jpeg' },
                      { name: 'Batata Rústica', price: '22,00', img: 'https://images.pexels.com/photos/1583884/pexels-photo-1583884.jpeg' }
                    ].map((item, i) => (
                      <div key={i} className="bg-[#1a1a1a] p-3 rounded-2xl flex gap-3 border border-white/5">
                        <OptimizedImage src={item.img} alt={item.name} width={80} height={80} className="w-20 h-20 rounded-xl" />
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
                  <div className="p-4 bg-gradient-to-t from-black/80 to-transparent">
                    <button className="w-full bg-[#FFC928] text-black font-black py-4 rounded-2xl text-sm shadow-xl">
                      Finalizar pedido
                    </button>
                  </div>
                  <div className="absolute top-10 right-[-10px] bg-[#FFC928] text-black text-[10px] font-black px-4 py-1.5 rounded-full shadow-lg rotate-12">
                    Zero comissão
                  </div>
                </div>
              </div>
              <div className="absolute -left-12 top-1/4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl animate-float">
                <CheckCircle className="text-[#FFC928] mb-2" size={24} />
                <div className="text-white font-bold text-sm">Zero comissão</div>
              </div>
              <div className="absolute -right-8 bottom-1/4 bg-white/10 backdrop-blur-md p-4 rounded-2xl border border-white/10 shadow-2xl animate-float" style={{ animationDelay: '3s' }}>
                <QrCode className="text-[#FFC928] mb-2" size={24} />
                <div className="text-white font-bold text-sm">QR Code</div>
              </div>
            </div>
          </ScrollReveal>

          {/* Mobile Hero Visual — phone mockup */}
          <ScrollReveal direction="up" delay={150} className="lg:hidden flex justify-center mt-4">
            <div className="relative w-[220px] bg-[#1a1a1a] rounded-[2.5rem] p-3 shadow-2xl border-2 border-gray-800/50">
              <div className="bg-[#111111] rounded-[2rem] overflow-hidden flex flex-col border border-white/5">
                <div className="p-4 pb-2 flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-gray-700 flex items-center justify-center text-[7px] text-white font-bold">PJ</div>
                  <div>
                    <div className="text-white text-[9px] font-bold">Pizzaria do João</div>
                    <div className="text-green-500 text-[7px] font-black uppercase">{t('restaurant.openNow')}</div>
                  </div>
                </div>
                <div className="px-3 pb-3 space-y-2">
                  {[
                    { name: 'Pizza Calabresa', price: 'R$ 49,90', emoji: '🍕' },
                    { name: 'Burger de Angus', price: 'R$ 38,00', emoji: '🍔' },
                    { name: 'Batata Rústica', price: 'R$ 22,00', emoji: '🍟' }
                  ].map((item, i) => (
                    <div key={i} className="bg-[#1a1a1a] p-2 rounded-xl flex items-center gap-2 border border-white/5">
                      <div className="w-9 h-9 rounded-lg bg-gray-800 flex items-center justify-center text-xs">{item.emoji}</div>
                      <div className="flex-1 min-w-0">
                        <div className="text-white text-[9px] font-bold truncate">{item.name}</div>
                        <div className="text-gray-500 text-[8px] truncate">{item.price}</div>
                      </div>
                      <div className="w-5 h-5 bg-[#FFC928] rounded-md flex items-center justify-center"><Plus size={10} className="text-black" /></div>
                    </div>
                  ))}
                </div>
                <div className="px-3 pb-3">
                  <div className="w-full bg-[#FFC928] text-black font-black py-2.5 rounded-xl text-[9px] text-center">Finalizar pedido</div>
                </div>
              </div>
              <div className="absolute -top-2 -right-3 bg-[#FFC928] text-black text-[8px] font-black px-3 py-1 rounded-full shadow-lg rotate-12">
                Zero comissão
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Ticker ─── */}
      <div className="bg-[#FFC928] py-3 overflow-hidden whitespace-nowrap border-y-4 border-black">
        <div className="inline-block animate-marquee-slow">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className="text-black font-black text-lg lg:text-xl mx-10 uppercase italic tracking-tighter">
              ZERO COMISSÃO • PEDIDO DIRETO • CARDÁPIO DIGITAL • QR CODE • DELIVERY PRÓPRIO •
            </span>
          ))}
        </div>
        <div className="inline-block animate-marquee-slow">
          {[1, 2, 3, 4, 5].map(i => (
            <span key={i} className="text-black font-black text-lg lg:text-xl mx-10 uppercase italic tracking-tighter">
              ZERO COMISSÃO • PEDIDO DIRETO • CARDÁPIO DIGITAL • QR CODE • DELIVERY PRÓPRIO •
            </span>
          ))}
        </div>
      </div>

      {/* ─── Stats Bar ─── */}
      <section className={`py-16 transition-colors ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F5F5F5]'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: `+${Math.max(liveRestaurantCount, 500)}`, label: 'Restaurantes ativos', icon: Users },
              { value: '0%', label: 'Comissão por pedido', icon: Banknote },
              { value: '<10min', label: 'Tempo de cadastro', icon: Clock },
              { value: '24h', label: 'Suporte via WhatsApp', icon: Smartphone },
            ].map((stat, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 80}>
                <div className={`flex flex-col items-center gap-2 p-4 rounded-2xl transition-colors ${isDark ? 'bg-white/5' : 'bg-white'}`}>
                  <stat.icon size={20} className="text-[#FFC928]" />
                  <div className={`text-2xl md:text-3xl font-display font-black ${isDark ? 'text-white' : 'text-[#111]'}`}>{stat.value}</div>
                  <div className={`text-[10px] font-bold uppercase tracking-widest ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{stat.label}</div>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Features (4 cards) ─── */}
      <section className={`py-24 transition-colors ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <ScrollReveal direction="up" delay={0}>
            <SectionHeader
              subtitle="Por que o Meu Ovo?"
              title="Tudo que seu restaurante precisa"
              description="Sem taxa. Sem mensalidade. Sem surpresas."
              subtitleClass="text-[#FFC928]"
              titleClass={isDark ? 'text-white' : 'text-[#111]'}
            />
          </ScrollReveal>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mt-16">
            {[
              { icon: CheckCircle, color: 'text-[#FFC928]', title: '100% Gratuito', desc: 'Sem mensalidade, sem taxa de setup e sem comissão por pedido. Para sempre.' },
              { icon: Zap, color: 'text-[#FF7A00]', title: 'Link próprio', desc: 'Compartilhe seu cardápio pelo WhatsApp e Instagram em segundos.' },
              { icon: QrCode, color: 'text-[#FFC928]', title: t('landing.qrCodeTitle'), desc: t('landing.qrCodeDesc') },
              { icon: Sticker, color: 'text-[#FFC928]', title: 'Etiquetas Inteligentes', desc: 'Validade, alérgenos e lote — etiquetas automáticas para seus produtos.' },
            ].map((feat, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 80}>
                <div className={`group p-8 rounded-[2.5rem] text-left transition-all hover:shadow-2xl cursor-default h-full ${isDark ? 'bg-[#111] border border-white/5 hover:border-white/10' : 'bg-white border border-gray-100 hover:shadow-gray-200/50'}`}>
                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center mb-6 transition-transform group-hover:scale-110 ${isDark ? 'bg-white/5' : 'bg-gray-50'}`}>
                    <feat.icon className={feat.color} size={24} />
                  </div>
                  <h3 className={`text-xl font-display font-black mb-2 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{feat.title}</h3>
                  <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {feat.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Secondary Features (3 cards) ─── */}
      <section className={`py-16 transition-colors ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F9F9F9]'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[
              { icon: Smartphone, title: t('landing.deliveryTitle'), desc: t('landing.deliveryDesc') },
              { icon: TrendingUp, title: t('landing.dashboardTitle'), desc: t('landing.dashboardDesc') },
              { icon: Heart, title: t('landing.socialTitle'), desc: t('landing.socialDesc') },
            ].map((feat, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 100}>
                <div className={`group p-8 rounded-[2.5rem] text-left hover:shadow-xl transition-all cursor-default h-full ${isDark ? 'bg-[#111] border border-white/5 hover:border-white/10' : 'bg-white border border-gray-100'}`}>
                  <div className="w-12 h-12 mb-6 group-hover:scale-110 transition-transform">
                    <feat.icon className="text-[#FFC928]" size={32} />
                  </div>
                  <h3 className={`text-xl font-display font-black mb-2 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{feat.title}</h3>
                  <p className={`text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {feat.desc}
                  </p>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Comparison: Meu Ovo vs Plataformas ─── */}
      <section className={`py-24 transition-colors ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-5xl mx-auto px-4">
          <ScrollReveal direction="up" delay={0}>
            <SectionHeader
              subtitle="A comparação que importa"
              title="Meu Ovo vs. Grandes Plataformas"
              description="Veja a diferença na sua margem de lucro"
              subtitleClass="text-[#FFC928]"
              titleClass={isDark ? 'text-white' : 'text-[#111]'}
            />
          </ScrollReveal>

          <ScrollReveal direction="up" delay={100}>
            <div className={`mt-16 rounded-[2.5rem] overflow-hidden border transition-colors ${isDark ? 'border-white/5 bg-[#111]' : 'border-gray-100 bg-white'}`}>
              {/* Header */}
              <div className="grid grid-cols-3 gap-0">
                <div className={`p-6 md:p-8 ${isDark ? 'bg-[#0a0a0a]' : 'bg-gray-50'}`} />
                <div className={`p-6 md:p-8 text-center border-x transition-colors ${isDark ? 'bg-[#FFC928]/10 border-white/5' : 'bg-[#FFF8E1] border-amber-100'}`}>
                  <div className="text-xs font-black uppercase tracking-widest text-[#FFC928] mb-1">Meu Ovo</div>
                  <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>Cardápio Digital Próprio</div>
                </div>
                <div className={`p-6 md:p-8 text-center transition-colors ${isDark ? 'bg-white/5' : 'bg-gray-100'}`}>
                  <div className={`text-xs font-black uppercase tracking-widest mb-1 ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>iFood / Rappi</div>
                  <div className={`text-[10px] font-bold uppercase ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>Marketplace</div>
                </div>
              </div>

              {/* Rows */}
              {[
                { feature: 'Comissão por pedido', meuOvo: '0%', competitor: '27-35%', highlight: true },
                { feature: 'Mensalidade', meuOvo: 'Grátis', competitor: 'Variável', highlight: false },
                { feature: 'Pedido chega no WhatsApp', meuOvo: true, competitor: false, highlight: false },
                { feature: 'Cliente é do restaurante', meuOvo: true, competitor: false, highlight: true },
                { feature: 'QR Code para mesa', meuOvo: true, competitor: false, highlight: false },
                { feature: 'Cardápio digital próprio', meuOvo: true, competitor: false, highlight: false },
                { feature: 'Doação no checkout', meuOvo: true, competitor: false, highlight: false },
                { feature: 'Tempo de setup', meuOvo: '<10 min', competitor: 'Dias/semanas', highlight: false },
              ].map((row, i) => (
                <div key={i} className={`grid grid-cols-3 gap-0 border-t transition-colors ${isDark ? 'border-white/5' : 'border-gray-100'} ${row.highlight ? (isDark ? 'bg-[#FFC928]/[0.03]' : 'bg-[#FFF8E1]/50') : ''}`}>
                  <div className={`p-4 md:p-5 flex items-center text-xs md:text-sm font-bold ${isDark ? 'text-gray-300' : 'text-gray-700'}`}>{row.feature}</div>
                  <div className={`p-4 md:p-5 flex items-center justify-center border-x transition-colors ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
                    {typeof row.meuOvo === 'boolean' ? (
                      <CheckCircle size={18} className="text-emerald-500" />
                    ) : (
                      <span className="text-xs md:text-sm font-black text-[#FFC928]">{row.meuOvo}</span>
                    )}
                  </div>
                  <div className={`p-4 md:p-5 flex items-center justify-center`}>
                    {typeof row.competitor === 'boolean' ? (
                      row.competitor ? <CheckCircle size={18} className="text-emerald-500" /> : <X size={18} className="text-red-400" />
                    ) : (
                      <span className={`text-xs md:text-sm font-bold ${isDark ? 'text-gray-500' : 'text-gray-400'}`}>{row.competitor}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── How it Works ─── */}
      <section className={`py-24 transition-colors ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F5F5F5]'}`}>
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className={`text-3xl md:text-5xl font-display font-black mb-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('landing.howItWorksTitle')}</h2>
          <p className={`text-base lg:text-lg mb-16 font-display font-semibold tracking-tight transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>{t('landing.howItWorksSubtitle')}</p>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 md:gap-12 relative">
            <div className="hidden md:block absolute top-[40px] left-[15%] right-[15%] h-0.5 border-t-2 border-dashed border-gray-300 dark:border-gray-800" />

            {[
              { id: '01', title: t('landing.step1Title'), desc: t('landing.step1Desc') },
              { id: '02', title: t('landing.step2Title'), desc: t('landing.step2Desc') },
              { id: '03', title: t('landing.step3Title'), desc: t('landing.step3Desc') },
              { id: '04', title: t('landing.step4Title'), desc: t('landing.step4Desc') }
            ].map((step, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 100}>
                <div className="group relative z-10 flex flex-col items-center cursor-default">
                  <div className="w-16 h-16 bg-[#FFC928] rounded-2xl flex items-center justify-center text-xl font-display font-black text-black mb-6 shadow-xl shadow-[#FFC928]/10 transition-transform group-hover:scale-110">
                    {step.id}
                  </div>
                  <h3 className={`text-lg font-display font-black mb-2 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{step.title}</h3>
                  <p className={`text-sm font-medium leading-relaxed max-w-[200px] ${isDark ? 'text-gray-500' : 'text-gray-500'}`}>{step.desc}</p>
                </div>
              </ScrollReveal>
            ))}
          </div>

          <ScrollReveal direction="up" delay={200}>
            <div className="mt-16">
              <Link
                to="/cadastro"
                className="inline-flex items-center gap-3 bg-[#FFC928] text-[#111] font-display font-black px-10 py-5 rounded-2xl text-lg hover:bg-[#e6b520] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#FFC928]/20"
              >
                {t('landing.startNow')} <ArrowRight size={22} />
              </Link>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Ovos de Ouro ─── */}
      <section className={`py-20 border-y transition-colors ${isDark ? 'bg-zinc-950/40 border-white/5' : 'bg-amber-50/40 border-amber-100'}`}>
        <div className="max-w-7xl mx-auto px-6">
          <ScrollReveal direction="up" delay={0}>
            <div className="bg-gradient-to-br from-[#111] via-[#1a1a1a] to-[#121212] border border-[#FFC928]/30 rounded-[2.5rem] p-8 md:p-12 relative overflow-hidden text-left shadow-2xl text-white">
              <div className="absolute top-0 right-0 w-80 h-80 bg-[#FFC928]/5 rounded-full blur-3xl" />
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-center relative z-10">
                <div className="lg:col-span-2 space-y-4">
                  <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-wider">
                    <span className="bg-gradient-to-r from-[#FFC928] via-yellow-300 to-[#FFC928] bg-clip-text text-transparent">🏆 Competição Anual Meu Ovo</span>
                  </div>
                  <h2 className="text-2xl md:text-4xl font-display font-black leading-none uppercase italic tracking-tighter">
                    Prêmio Ovos de Ouro
                  </h2>
                  <p className="text-gray-400 font-medium text-sm max-w-xl leading-relaxed">
                    Buscamos os melhores sabores do Brasil com integridade total. As avaliações acumuladas do campeonato são sigilosas e privadas. Apenas os 3 melhores de cada ano são revelados.
                  </p>
                  <div className="flex flex-wrap gap-4 pt-2">
                    <div className="flex items-center gap-2">
                      <Shield className="text-[#FFC928]" size={16} />
                      <span className="text-xs text-gray-300 font-bold uppercase tracking-tight">Sigilo absoluto</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Trophy className="text-[#FFC928]" size={16} />
                      <span className="text-xs text-gray-300 font-bold uppercase tracking-tight">Top 3 divulgado</span>
                    </div>
                  </div>
                </div>
                <div className="flex flex-col sm:flex-row lg:flex-col gap-3 justify-end">
                  <Link to="/ovos-de-ouro" className="bg-[#FFC928] text-[#111] hover:bg-[#e6b520] font-black text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all text-center flex items-center justify-center gap-2">
                    <span>Conhecer Regras</span>
                    <ArrowRight size={14} />
                  </Link>
                  <Link to="/cadastro" className="bg-white/10 hover:bg-white/15 border border-white/10 font-bold text-xs uppercase tracking-widest px-6 py-4 rounded-2xl transition-all text-center">
                    Participar Gratuitamente
                  </Link>
                </div>
              </div>
            </div>
          </ScrollReveal>
        </div>
      </section>

      {/* ─── Testimonials ─── */}
      <section className={`py-24 transition-colors overflow-hidden ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-5xl mx-auto px-6">
          <ScrollReveal direction="up" delay={0}>
            <SectionHeader
              subtitle="Quem usa, comprova"
              title="Histórias de Sucesso"
              description="Relatos de restaurantes parceiros que assumiram as rédeas do próprio delivery"
              subtitleClass="text-[#FFC928]"
              titleClass={isDark ? 'text-white' : 'text-[#111]'}
            />
          </ScrollReveal>

          <div className="relative min-h-[400px] sm:min-h-[340px] md:min-h-[280px] flex flex-col justify-center mt-12">
            <AnimatePresence mode="wait" custom={direction}>
              <motion.div
                key={currentTestimonial}
                custom={direction}
                initial={{ opacity: 0, x: direction > 0 ? 80 : -80 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: direction < 0 ? 80 : -80 }}
                transition={{ type: 'spring', stiffness: 220, damping: 24 }}
                className={`p-8 md:p-10 rounded-[2rem] border shadow-xl flex flex-col md:flex-row gap-8 items-center justify-between text-left ${
                  isDark ? 'bg-[#111] border-white/5' : 'bg-gray-50 border-gray-100'
                }`}
              >
                <div className="flex-1 space-y-5 relative">
                  <div className="absolute -top-4 -left-4 opacity-5 text-[#FFC928]">
                    <Quote size={64} />
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
                  <p className={`text-base sm:text-lg font-display font-semibold italic leading-relaxed tracking-tight transition-colors ${
                    isDark ? 'text-gray-200' : 'text-[#222]'
                  }`}>
                    &ldquo;{testimonials[currentTestimonial].text}&rdquo;
                  </p>
                  <div>
                    <h4 className={`font-black text-sm uppercase transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>
                      {testimonials[currentTestimonial].name}
                    </h4>
                    <p className="text-[10px] text-gray-400 font-bold uppercase tracking-wide">
                      {testimonials[currentTestimonial].restaurant} — <span className="text-[#FFC928]">{testimonials[currentTestimonial].location}</span>
                    </p>
                  </div>
                </div>

                <div className="flex flex-col items-center justify-center space-y-3 bg-amber-400/5 border border-amber-400/10 p-5 rounded-[1.5rem] w-full md:w-56 flex-shrink-0 text-center">
                  <div className="relative">
                    <OptimizedImage
                      src={testimonials[currentTestimonial].image}
                      alt={testimonials[currentTestimonial].restaurant}
                      width={72}
                      height={72}
                      className="w-18 h-18 rounded-full object-cover border-2 border-[#FFC928] shadow-md"
                    />
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

          <div className="flex items-center justify-between mt-8">
            <div className="flex gap-1.5">
              {testimonials.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => { setDirection(idx > currentTestimonial ? 1 : -1); setCurrentTestimonial(idx); }}
                  className={`h-2 rounded-full transition-all duration-300 ${
                    idx === currentTestimonial ? 'w-8 bg-[#FFC928]' : `w-2 ${isDark ? 'bg-zinc-800' : 'bg-gray-300'}`
                  }`}
                  aria-label={`Ir para slide ${idx + 1}`}
                />
              ))}
            </div>
            <div className="flex gap-2">
              <button
                onClick={handlePrev}
                className={`p-3 rounded-xl border transition-colors ${isDark ? 'border-white/5 text-white hover:bg-white/5' : 'border-gray-200 text-[#111] hover:bg-gray-100'}`}
                aria-label="Depoimento anterior"
              >
                <ChevronLeft size={18} />
              </button>
              <button
                onClick={handleNext}
                className={`p-3 rounded-xl border transition-colors ${isDark ? 'border-white/5 text-white hover:bg-white/5' : 'border-gray-200 text-[#111] hover:bg-gray-100'}`}
                aria-label="Próximo depoimento"
              >
                <ChevronRight size={18} />
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FAQ ─── */}
      <section className={`py-24 transition-colors ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#F5F5F5]'}`}>
        <div className="max-w-3xl mx-auto px-4">
          <ScrollReveal direction="up" delay={0}>
            <SectionHeader
              subtitle="Perguntas Frequentes"
              title="Tire suas dúvidas"
              subtitleClass="text-[#FFC928]"
              titleClass={isDark ? 'text-white' : 'text-[#111]'}
            />
          </ScrollReveal>

          <div className="mt-12 space-y-3">
            {faqData.map((faq, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 50}>
                <div className={`rounded-2xl border transition-colors overflow-hidden ${
                  isDark ? 'bg-[#111] border-white/5' : 'bg-white border-gray-100'
                } ${openFaq === i ? (isDark ? 'border-[#FFC928]/20' : 'border-[#FFC928]/30') : ''}`}>
                  <button
                    onClick={() => toggleFaq(i)}
                    className={`w-full flex items-center justify-between p-5 md:p-6 text-left transition-colors ${
                      isDark ? 'hover:bg-white/5' : 'hover:bg-gray-50'
                    }`}
                    aria-expanded={openFaq === i}
                  >
                    <span className={`text-sm md:text-base font-display font-black pr-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>
                      {faq.q}
                    </span>
                    <ChevronDown
                      size={18}
                      className={`shrink-0 transition-transform duration-300 ${openFaq === i ? 'rotate-180 text-[#FFC928]' : isDark ? 'text-gray-500' : 'text-gray-400'}`}
                    />
                  </button>
                  <AnimatePresence>
                    {openFaq === i && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                      >
                        <div className={`px-5 md:px-6 pb-5 md:pb-6 text-sm font-medium leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                          {faq.a}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Trust Badges ─── */}
      <section className={`py-16 transition-colors ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-5xl mx-auto px-4">
          <div className="flex flex-wrap items-center justify-center gap-6 md:gap-10">
            {[
              { icon: Shield, label: 'Dados protegidos com criptografia' },
              { icon: Banknote, label: 'Sem cartão de crédito necessário' },
              { icon: CheckCircle, label: 'Cancelamento a qualquer momento' },
              { icon: Smartphone, label: 'Suporte via WhatsApp' },
            ].map((badge, i) => (
              <ScrollReveal key={i} direction="up" delay={i * 60}>
                <div className="flex items-center gap-2">
                  <badge.icon size={16} className="text-[#FFC928] shrink-0" />
                  <span className={`text-[10px] md:text-xs font-bold uppercase tracking-wider ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                    {badge.label}
                  </span>
                </div>
              </ScrollReveal>
            ))}
          </div>
        </div>
      </section>

      {/* ─── Final CTA ─── */}
      <section className={`py-24 transition-colors ${isDark ? 'bg-[#0a0a0a]' : 'bg-[#111]'}`}>
        <div className="max-w-4xl mx-auto px-4 text-center">
          <ScrollReveal direction="up" delay={0}>
            <h2 className="text-3xl md:text-6xl font-display font-black text-white mb-4">
              O cliente é seu.<br />
              <span className="text-[#FFC928]">O pedido também.</span>
            </h2>
            <p className="text-gray-400 text-base lg:text-lg mb-10 font-display font-semibold tracking-tight">
              Zero taxa. Mais margem. Comece hoje.
            </p>
            <div className="flex flex-col sm:flex-row items-center justify-center gap-4">
              <Link
                to="/cadastro"
                className="w-full sm:w-auto bg-[#FFC928] text-[#111] font-display font-black px-10 py-5 rounded-2xl text-lg hover:bg-[#e6b520] transition-all hover:scale-105 active:scale-95 shadow-2xl shadow-[#FFC928]/20 flex items-center justify-center gap-3"
              >
                Criar meu cardápio grátis <ArrowRight size={20} />
              </Link>
              <Link
                to="/busca"
                className="w-full sm:w-auto border-2 border-white/20 text-white font-display font-black px-10 py-5 rounded-2xl text-lg hover:bg-white/5 hover:border-white/40 transition-all text-center"
              >
                Buscar restaurantes
              </Link>
            </div>
            <p className="text-[10px] text-gray-500 mt-6 font-bold uppercase tracking-widest">
              Cadastro em menos de 10 minutos • Sem cartão de crédito
            </p>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
