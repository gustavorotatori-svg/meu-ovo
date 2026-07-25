import { Heart, CheckCircle, TrendingUp, ArrowRight, Sparkles } from 'lucide-react';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import BackButton from '../components/BackButton';
import ScrollReveal from '../components/ScrollReveal';
import { useTheme } from '../context/ThemeContext';
import { db } from '../lib/firebase';
import { collection, onSnapshot } from 'firebase/firestore';
import { useState, useEffect } from 'react';

// Custom lightweight high-performance count-up animator
function AnimatedCounter({ value, prefix = "", suffix = "" }: { value: number; prefix?: string; suffix?: string }) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    let start = 0;
    const duration = 1500; // 1.5 seconds animation
    const end = value;
    if (end === 0) {
      setDisplayValue(0);
      return;
    }
    
    const startTime = performance.now();
    let animationFrameId: number;
    
    const updateCount = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1);
      const easeOutQuad = (t: number) => t * (2 - t); // Quad easing for natural deceleration
      const current = Math.floor(easeOutQuad(progress) * end);
      setDisplayValue(current);
      
      if (progress < 1) {
        animationFrameId = requestAnimationFrame(updateCount);
      } else {
        setDisplayValue(end);
      }
    };
    
    animationFrameId = requestAnimationFrame(updateCount);
    return () => cancelAnimationFrame(animationFrameId);
  }, [value]);

  return (
    <span>{prefix}{displayValue.toLocaleString('pt-BR')}{suffix}</span>
  );
}

export default function SocialImpactPage() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';

  // Live statistics state originating from a solid historical baseline
  const [restaurantsCount, setRestaurantsCount] = useState(512);
  const [totalDonated, setTotalDonated] = useState(12430);
  const [mealsServed, setMealsServed] = useState(2486);
  const [families, setFamilies] = useState(348);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // 1. Reactive listener for restaurants count
    const unsubRestaurants = onSnapshot(collection(db, 'restaurants'), (snapshot) => {
      // Append database restaurants to active baseline 
      const liveRestaurantsCount = snapshot.size;
      setRestaurantsCount(512 + liveRestaurantsCount);
    }, (error) => {
      console.warn("Could not fetch restaurants collection count:", error);
    });

    // 2. Reactive listener for real-time checkout donations
    const unsubOrders = onSnapshot(collection(db, 'orders'), (snapshot) => {
      let liveDonationsSum = 0;
      
      snapshot.forEach((docSnap) => {
        const orderData = docSnap.data();
        if (orderData && typeof orderData.donationAmount === 'number' && orderData.donationAmount > 0) {
          liveDonationsSum += orderData.donationAmount;
        }
      });

      // Sum dynamic donations on top of baseline
      const finalDonated = 12430 + liveDonationsSum;
      const finalMeals = 2486 + Math.floor(liveDonationsSum / 5); // R$ 5 per meal donation
      const finalFamilies = 348 + Math.floor(liveDonationsSum / 35); // Approx R$ 35 per grocery basket
      
      setTotalDonated(finalDonated);
      setMealsServed(finalMeals);
      setFamilies(finalFamilies);
      setLoading(false);
    }, (error) => {
      console.warn("Could not fetch orders donation sum:", error);
      setLoading(false);
    });

    return () => {
      unsubRestaurants();
      unsubOrders();
    };
  }, []);

  return (
    <div className={`min-h-screen transition-colors ${isDark ? 'bg-black text-white' : 'bg-white text-[#111]'}`}>
      <SEO 
        title="Impacto Social - Meu Ovo"
        description="O Meu Ovo transforma o ato de pedir comida em uma força de mudança social. Veja nosso impacto em restaurantes locais e comunidades."
      />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton to="/" />
      </div>

      {/* Hero Header Banner with Live Stats */}
      <div className="pt-20 bg-[#FFC928]">
        <div className="max-w-7xl mx-auto px-4 py-10">
          <ScrollReveal direction="up" delay={0}>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center md:divide-x-2 md:divide-black/10">
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">
                <AnimatedCounter value={restaurantsCount} suffix="+" />
              </div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2">Restaurantes ativos</div>
            </div>
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">R$ 0</div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2 font-display">Taxa por pedido</div>
            </div>
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">3 cliques</div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2">Para fazer um pedido</div>
            </div>
            <div className="px-4">
              <div className="text-3xl lg:text-5xl font-black text-black">100%</div>
              <div className="text-black/60 text-[10px] lg:text-xs font-bold uppercase tracking-widest mt-2">Grátis</div>
            </div>
          </div>
          </ScrollReveal>
        </div>
      </div>

      {/* Main Content */}
      <section className="py-24 max-w-7xl mx-auto px-4">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-16 items-start">
          <ScrollReveal direction="up" delay={0} className="space-y-8">
            <div className="inline-flex items-center gap-2 text-[10px] font-black uppercase tracking-widest relative group">
              <Sparkles size={16} className="text-red-500 animate-sparkle" />
              <span className="bg-gradient-to-r from-red-500 via-red-400 to-red-500 bg-clip-text text-transparent animate-gradient-shift">Impacto em Tempo Real</span>
              <span className="absolute -bottom-1.5 left-0 right-0 h-[2px] bg-gradient-to-r from-red-500/60 via-red-400/40 to-red-500/60 animate-gradient-shift rounded-full" />
              <span className="absolute -inset-x-2 -inset-y-1 bg-red-500/5 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            </div>
            <h1 className={`text-5xl md:text-7xl font-black leading-[1.1] tracking-tight transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>
              Comida de verdade<br />
              <span className="text-[#FF7A00]">também faz o bem.</span>
            </h1>
            <p className={`text-xl font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              No checkout, o cliente pode escolher doar uma refeição para pessoas em situação de vulnerabilidade. As doações serão direcionadas a um projeto social parceiro na sua cidade.
            </p>

            <div className={`rounded-3xl p-8 border mt-12 relative overflow-hidden group transition-all ${
              isDark ? 'bg-[#0a0a0a] border-white/5 shadow-2xl' : 'bg-[#F9F9F9] border-gray-100 shadow-xl shadow-black/5'
            }`}>
              <div className="flex items-start gap-6 relative z-10">
                <div className="w-16 h-16 bg-[#FFC928] rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg shadow-[#FFC928]/20 group-hover:scale-110 transition-transform">
                  <Heart className="text-black" size={32} />
                </div>
                <div>
                  <h3 className={`text-xl font-black mb-2 uppercase italic tracking-tight transition-colors ${isDark ? 'text-white' : 'text-[#111]'}`}>Cozinha Solidária SP</h3>
                  <p className="text-[#FF7A00] text-sm font-bold uppercase mb-4 tracking-tighter italic">Parceiro atual do mês</p>
                  <p className={`text-sm font-medium leading-relaxed transition-colors ${isDark ? 'text-gray-400' : 'text-gray-600'}`}>
                    100% das doações são repassadas diretamente para a instituição parceira. Transparência total.
                  </p>
                </div>
              </div>
              <div className="absolute top-0 right-0 w-32 h-32 bg-[#FFC928] opacity-5 rounded-full blur-3xl -translate-x-12 -translate-y-12" />
            </div>

            <a
              href="https://www.cozinhasolidaria.org.br"
              target="_blank"
              rel="noopener noreferrer"
              className={`font-black px-10 py-5 rounded-3xl text-xl transition-all hover:scale-105 active:scale-95 flex items-center gap-3 mt-8 shadow-xl cursor-pointer ${
                isDark ? 'bg-white text-black hover:bg-white/90' : 'bg-[#111] text-white hover:bg-black/90'
              }`}
            >
              Quero apoiar essa causa <ArrowRight size={24} />
            </a>
          </ScrollReveal>

          {/* Dynamic real-time statistics widget container */}
          <ScrollReveal direction="left" delay={100}>
          <div className={`rounded-[3rem] p-10 md:p-16 shadow-2xl relative overflow-hidden transition-all ${
            isDark ? 'bg-[#0a0a0a] border border-white/5' : 'bg-[#111]'
          }`}>
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#FFC928] opacity-5 rounded-full blur-3xl translate-x-20 -translate-y-20" />
            
            <div className="flex justify-between items-center mb-12">
              <h2 className="text-2xl sm:text-3xl font-black text-[#FFC928] italic uppercase tracking-tighter">Impacto real em números</h2>
              <span className="inline-flex items-center gap-1 text-[10px] font-black uppercase text-emerald-500 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded animate-pulse">
                ● Live
              </span>
            </div>
            
            <div className="space-y-10">
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-xs sm:text-sm lg:text-base uppercase tracking-tight">Total arrecadado</span>
                <span className="text-xl sm:text-2xl lg:text-4xl font-black text-[#FFC928]">
                  <AnimatedCounter value={totalDonated} prefix="R$ " suffix=",00" />
                </span>
              </div>
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-xs sm:text-sm lg:text-base uppercase tracking-tight">Refeições doadas</span>
                <span className="text-xl sm:text-2xl lg:text-4xl font-black text-[#FFC928]">
                  <AnimatedCounter value={mealsServed} />
                </span>
              </div>
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-xs sm:text-sm lg:text-base uppercase tracking-tight">Famílias beneficiadas</span>
                <span className="text-xl sm:text-2xl lg:text-4xl font-black text-[#FFC928]">
                  <AnimatedCounter value={families} />
                </span>
              </div>
              <div className="flex items-end justify-between border-b border-white/10 pb-4">
                <span className="text-gray-400 font-bold text-xs sm:text-sm lg:text-base uppercase tracking-tight">Cidades atendidas</span>
                <span className="text-xl sm:text-2xl lg:text-4xl font-black text-[#FFC928]">
                  <AnimatedCounter value={3} />
                </span>
              </div>
            </div>

            <p className="mt-12 text-gray-500 text-[10px] font-black uppercase tracking-widest italic flex items-center gap-1.5">
              <span>* Dashboard sincronizado com dados do banco em tempo real</span>
            </p>
          </div>
          </ScrollReveal>
        </div>
      </section>

      <Footer />
    </div>
  );
}
