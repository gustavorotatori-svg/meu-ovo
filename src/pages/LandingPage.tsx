import { Link } from 'react-router-dom';
import { ShoppingBag, ArrowRight, CheckCircle, Zap, Heart, UtensilsCrossed, Plus, Smartphone, TrendingUp, Star, QrCode } from 'lucide-react';
import { useTranslation } from 'react-i18next';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { useTheme } from '../context/ThemeContext';
import { Logo } from '../components/Logo';
import OptimizedImage from '../components/OptimizedImage';

export default function LandingPage() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';

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
            <p className={`max-w-xl text-lg lg:text-xl mb-10 font-medium leading-relaxed transition-colors ${
              isDark ? 'text-gray-400' : 'text-gray-600'
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
          <p className={`text-xl max-w-2xl mx-auto font-medium transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
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

      {/* How it Works Section */}
      <section className="py-32 bg-[#0a0a0a]">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <h2 className="text-4xl md:text-6xl font-display font-black text-white mb-6">{t('landing.howItWorksTitle')}</h2>
          <p className="text-gray-500 text-xl mb-20 font-medium">{t('landing.howItWorksSubtitle')}</p>

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

      {/* Testimonials */}
      <section className={`py-32 transition-colors ${isDark ? 'bg-black' : 'bg-white'}`}>
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-20">
            <h2 className={`text-4xl md:text-6xl font-black mb-6 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{t('landing.testimonialsTitle')}</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              { name: 'João, Pizzaria do João', initial: 'J', text: '"Antes eu pagava quase 30% de comissão. Agora o pedido vai direto pro meu WhatsApp. Minha margem dobrou."' },
              { name: 'Ana, Marmita da Dona Ana', initial: 'A', text: '"Meus clientes adoraram o cardápio. Fica compartilhando no grupo do condomínio e eu não preciso mais montar lista de preços no Word."' },
              { name: 'Carlos, Burger da Praça', initial: 'C', text: '"Fácil de configurar, rápido de usar. O QR Code na mesa foi uma revolução. Menos garçom, mais pedido."' }
            ].map((t, i) => (
              <div key={i} className={`p-10 rounded-[3rem] flex flex-col justify-between border transition-all hover:shadow-2xl ${
                isDark ? 'bg-[#0a0a0a] border-white/5' : 'bg-[#F9F9F9] border-gray-100'
              }`}>
                <div>
                  <div className="flex gap-1 mb-6">
                    {[1, 2, 3, 4, 5].map(s => <Star key={s} size={16} className="fill-[#FFC928] text-[#FFC928]" />)}
                  </div>
                  <p className={`text-lg font-medium italic mb-10 leading-relaxed transition-colors ${isDark ? 'text-gray-300' : 'text-[#222]'}`}>
                    {t.text}
                  </p>
                </div>
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 bg-[#FFC928] rounded-full flex items-center justify-center font-black text-black">
                    {t.initial}
                  </div>
                  <span className={`font-black underline decoration-[#FFC928] decoration-2 underline-offset-4 transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>{t.name}</span>
                </div>
              </div>
            ))}
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
          <p className="text-gray-500 text-xl lg:text-2xl mb-12 font-medium">
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
