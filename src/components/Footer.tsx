import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import { Instagram, Twitter, Facebook, Youtube, ExternalLink, Mail, Phone, MapPin, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { db } from '../lib/firebase';
import { collection, addDoc } from 'firebase/firestore';

export default function Footer() {
  const { t } = useTranslation();
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [subscribed, setSubscribed] = useState(false);

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;

    setLoading(true);
    try {
      const response = await fetch('/api/newsletter/subscribe', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      });
      const data = await response.json();
      
      if (data.success) {
        setSubscribed(true);
        toast.success(t('footer.subscribeSuccess') || 'Inscrito com sucesso! Verifique seu email.');
      } else {
        toast.error(t('footer.subscribeError') || 'Erro ao se inscrever. Tente novamente.');
      }
    } catch (error) {
      // Fallback: save to Firestore directly
      try {
        await addDoc(collection(db, 'newsletter_subscribers'), { email, subscribedAt: new Date().toISOString() });
        setSubscribed(true);
        toast.success(t('footer.subscribeSuccess') || 'Inscrito com sucesso!');
      } catch (fbError) {
        console.error('Newsletter error:', error, 'Firestore fallback:', fbError);
        toast.error('Erro de conexão.');
      }
    } finally {
      setLoading(false);
    }
  };

  const FOOTER_LINKS = {
    company: [
      { label: t('nav.social_impact'), to: '/impacto-social' },
      { label: 'Blog', to: '/blog' },
      { label: 'Ovos de Ouro 🏆', to: '/ovos-de-ouro' },
      { label: 'Sobre nós', to: '/sobre' },
    ],
    restaurants: [
      { label: t('nav.register_restaurant'), to: '/cadastro' },
      { label: 'Portal do Parceiro', to: '/admin' },
      { label: 'Prêmio Ovos de Ouro', to: '/ovos-de-ouro' },
      { label: 'Marketplace', to: '/busca' },
      { label: 'Etiquetas', to: '/admin/etiquetas' },
    ],
    legal: [
      { label: 'Termos de Uso', to: '/termos' },
      { label: 'Privacidade', to: '/privacidade' },
    ]
  };

  return (
    <footer className={`transition-colors border-t ${isDark ? 'bg-[#0a0a0a] border-white/5 text-white' : 'bg-white border-gray-100 text-[#111]'} pt-24 pb-12`}>
      <div className="max-w-7xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-12 lg:gap-8 mb-20">
          <div className="lg:col-span-2">
            <Logo size="lg" variant={isDark ? 'dark-colored' : 'colored'} className="mb-8" />
            
            {(() => {
              const desc = t('footer.description') || '';
              let firstPart = '';
              let secondPart = '';
              
              const match = desc.match(/(.*?foodzinho\.)\s*(.*)/i);
              if (match) {
                firstPart = match[1];
                secondPart = match[2];
              } else {
                const dotIndex = desc.indexOf('. ');
                if (dotIndex !== -1) {
                  const secondDotIndex = desc.indexOf('. ', dotIndex + 2);
                  if (secondDotIndex !== -1) {
                    firstPart = desc.substring(0, secondDotIndex + 1);
                    secondPart = desc.substring(secondDotIndex + 1).trim();
                  } else {
                    firstPart = desc.substring(0, dotIndex + 1);
                    secondPart = desc.substring(dotIndex + 1).trim();
                  }
                } else {
                  firstPart = desc;
                }
              }

              return (
                <div className="space-y-3 mb-8">
                  {firstPart && (
                    <p className={`font-display font-black text-lg tracking-tight uppercase italic leading-tight ${isDark ? 'text-[#FFC928]' : 'text-orange-500'}`}>
                      {firstPart}
                    </p>
                  )}
                  {secondPart && (
                    <p className={`text-[11px] font-bold tracking-wider leading-relaxed uppercase ${isDark ? 'text-zinc-400' : 'text-zinc-500'}`}>
                      {secondPart}
                    </p>
                  )}
                </div>
              );
            })()}

            <div className="flex gap-4">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                <span key={i} className={`w-10 h-10 rounded-full flex items-center justify-center cursor-default ${isDark ? 'bg-white/5 text-gray-500' : 'bg-gray-50 text-gray-400'}`}>
                  <Icon size={18} />
                </span>
              ))}
            </div>
          </div>

          <div>
            <div className="relative mb-6">
              <h4 className={`font-display font-black uppercase tracking-widest text-xs ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Plataforma
              </h4>
              <div className="h-0.5 w-8 bg-[#FFC928] mt-2 rounded" />
            </div>
            <ul className="space-y-4">
              {FOOTER_LINKS.company.map(link => (
                <li key={link.label}>
                  <Link 
                    to={link.to} 
                    className={`group flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 hover:translate-x-1 ${
                      isDark ? 'text-zinc-400 hover:text-[#FFC928]' : 'text-zinc-600 hover:text-orange-500'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 scale-0 group-hover:scale-100 transition-transform duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <div className="relative mb-6">
              <h4 className={`font-display font-black uppercase tracking-widest text-xs ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                Restaurantes
              </h4>
              <div className="h-0.5 w-8 bg-[#FFC928] mt-2 rounded" />
            </div>
            <ul className="space-y-4">
              {FOOTER_LINKS.restaurants.map(link => (
                <li key={link.label}>
                  <Link 
                    to={link.to} 
                    className={`group flex items-center gap-1.5 text-xs font-black uppercase tracking-wider transition-all duration-200 hover:translate-x-1 ${
                      isDark ? 'text-zinc-400 hover:text-[#FFC928]' : 'text-zinc-600 hover:text-orange-500'
                    }`}
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-orange-500 scale-0 group-hover:scale-100 transition-transform duration-200" />
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <div className="relative mb-6">
                <h4 className={`font-display font-black uppercase tracking-widest text-xs ${isDark ? 'text-white' : 'text-neutral-900'}`}>
                  Fale Conosco
                </h4>
                <div className="h-0.5 w-8 bg-[#FFC928] mt-2 rounded" />
              </div>
              <div className="space-y-4">
                <a 
                  href="mailto:contato@meuovo.com" 
                  className={`group flex items-center gap-3 text-xs font-black uppercase tracking-wider transition-all duration-200 hover:translate-x-1 ${
                    isDark ? 'text-zinc-300 hover:text-[#FFC928]' : 'text-zinc-700 hover:text-orange-500'
                  }`}
                >
                  <Mail size={14} className="text-[#FFC928] shrink-0" />
                  contato@meuovo.com
                </a>
                <a 
                  href="tel:+5511999999999" 
                  className={`group flex items-center gap-3 text-xs font-black uppercase tracking-wider transition-all duration-200 hover:translate-x-1 ${
                    isDark ? 'text-zinc-300 hover:text-[#FFC928]' : 'text-zinc-700 hover:text-orange-500'
                  }`}
                >
                  <Phone size={14} className="text-[#FFC928] shrink-0" />
                  (11) 99999-9999
                </a>
                <div 
                  className={`flex items-center gap-3 text-xs font-black uppercase tracking-wider ${
                    isDark ? 'text-zinc-400' : 'text-zinc-500'
                  }`}
                >
                  <MapPin size={14} className="text-[#FFC928] shrink-0" />
                  São Paulo, SP - Brasil
                </div>
              </div>
            </div>
            
            <form 
              onSubmit={handleSubscribe} 
              className={`mt-10 p-6 rounded-3xl transition-all duration-300 border-2 ${
                isDark 
                  ? 'bg-zinc-900/50 border-zinc-800/80 shadow-md shadow-black/20' 
                  : 'bg-slate-50 border-slate-100 shadow-sm'
              }`}
            >
              <p className={`text-[11px] font-black uppercase tracking-[0.15em] mb-3 ${isDark ? 'text-orange-400' : 'text-orange-500'} font-sans`}>
                Newsletter para Parceiro
              </p>
              {subscribed ? (
                <div className="flex items-center gap-3 py-2 text-green-500 animate-in fade-in zoom-in duration-500">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-black uppercase tracking-tight">Inscrição confirmada!</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Seu e-mail profissional" 
                    className={`flex-1 bg-transparent border-b-2 outline-none text-xs font-bold uppercase tracking-wider py-2 transition-colors ${
                      isDark 
                        ? 'border-zinc-800 focus:border-[#FFC928] text-white' 
                        : 'border-slate-200 focus:border-[#FF7A00] text-neutral-900'
                    }`}
                  />
                  <button
                    type="submit"
                    disabled={loading}
                    aria-label="Assinar newsletter"
                    className={`p-2 rounded-xl transition-all ${
                      loading
                        ? 'opacity-50'
                        : isDark
                          ? 'text-[#FFC928] hover:bg-[#FFC928]/10 hover:scale-110'
                          : 'text-orange-500 hover:bg-orange-50 hover:scale-110'
                    }`}
                  >
                    {loading ? <Loader2 size={16} className="animate-spin" /> : <ArrowRight size={16} />}
                  </button>
                </div>
              )}
              <p className="text-[8px] mt-4 opacity-50 leading-normal uppercase font-black tracking-wider">
                Receba as notícias semanais do Blog Meu Ovo direto no seu e-mail.
              </p>
            </form>
          </div>
        </div>

        <div className={`pt-12 border-t flex flex-col md:flex-row items-center justify-between gap-6 ${isDark ? 'border-white/5' : 'border-gray-100'}`}>
          <div className="flex items-center gap-8">
            <p className={`text-[10px] font-black uppercase tracking-[0.2em] opacity-40`}>
              © {new Date().getFullYear()} MEU OVO | Todos os direitos reservados.
            </p>
            <div className="hidden md:flex gap-6">
              {FOOTER_LINKS.legal.map(link => (
                <Link key={link.label} to={link.to} className={`text-[10px] font-black uppercase tracking-widest opacity-40 hover:opacity-100 transition-opacity`}>
                  {link.label}
                </Link>
              ))}
            </div>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">Feito com</span>
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-[10px] font-black uppercase tracking-widest opacity-40">em SP</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
