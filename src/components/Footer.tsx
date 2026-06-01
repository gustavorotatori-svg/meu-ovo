import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useTheme } from '../context/ThemeContext';
import { Logo } from './Logo';
import { Instagram, Twitter, Facebook, Youtube, ExternalLink, Mail, Phone, MapPin, ArrowRight, Loader2, CheckCircle2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
      console.error('Newsletter error:', error);
      toast.error('Erro de conexão.');
    } finally {
      setLoading(false);
    }
  };

  const FOOTER_LINKS = {
    company: [
      { label: t('nav.social_impact'), to: '/impacto-social' },
      { label: 'Blog', to: '/blog' },
      { label: 'Sobre nós', to: '/sobre' },
    ],
    restaurants: [
      { label: t('nav.register_restaurant'), to: '/cadastro-restaurante' },
      { label: 'Portal do Parceiro', to: '/admin' },
      { label: 'Marketplace', to: '/busca' },
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
            <p className={`text-sm leading-relaxed mb-8 max-w-sm ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
              {t('footer.description')}
            </p>
            <div className="flex gap-4">
              {[Instagram, Twitter, Facebook, Youtube].map((Icon, i) => (
                <a key={i} href="#" className={`w-10 h-10 rounded-full flex items-center justify-center transition-all ${isDark ? 'bg-white/5 hover:bg-white/10 text-gray-400 hover:text-white' : 'bg-gray-50 hover:bg-gray-100 text-gray-400 hover:text-black'}`}>
                  <Icon size={18} />
                </a>
              ))}
            </div>
          </div>

          <div>
            <h4 className="font-display font-black uppercase tracking-widest text-[10px] mb-6 opacity-40">Plataforma</h4>
            <ul className="space-y-4">
              {FOOTER_LINKS.company.map(link => (
                <li key={link.label}>
                  <Link to={link.to} className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div>
            <h4 className="font-display font-black uppercase tracking-widest text-[10px] mb-6 opacity-40">Restaurantes</h4>
            <ul className="space-y-4">
              {FOOTER_LINKS.restaurants.map(link => (
                <li key={link.label}>
                  <Link to={link.to} className={`text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>

          <div className="lg:col-span-2 flex flex-col justify-between">
            <div>
              <h4 className="font-display font-black uppercase tracking-widest text-[10px] mb-6 opacity-40">Fale Conosco</h4>
              <div className="space-y-4">
                <a href="mailto:contato@meuovo.com" className={`flex items-center gap-3 text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                  <Mail size={16} className="text-[#FFC928]" />
                  contato@meuovo.com
                </a>
                <a href="tel:+5511999999999" className={`flex items-center gap-3 text-sm font-medium transition-colors ${isDark ? 'text-gray-400 hover:text-white' : 'text-gray-500 hover:text-black'}`}>
                  <Phone size={16} className="text-[#FFC928]" />
                  (11) 99999-9999
                </a>
                <div className={`flex items-center gap-3 text-sm font-medium ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                  <MapPin size={16} className="text-[#FFC928]" />
                  São Paulo, SP - Brasil
                </div>
              </div>
            </div>
            
            <form onSubmit={handleSubscribe} className={`mt-10 p-6 rounded-2xl ${isDark ? 'bg-white/5 border border-white/5' : 'bg-gray-50 border border-gray-100'}`}>
              <p className="text-[10px] font-black uppercase tracking-widest mb-2 opacity-60">Newsletter para Parceiros</p>
              {subscribed ? (
                <div className="flex items-center gap-3 py-2 text-green-500 animate-in fade-in zoom-in duration-500">
                  <CheckCircle2 size={18} />
                  <span className="text-xs font-bold uppercase tracking-tight">Inscrição confirmada!</span>
                </div>
              ) : (
                <div className="flex gap-2">
                  <input 
                    type="email" 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    placeholder="Seu e-mail profissional" 
                    className={`flex-1 bg-transparent border-b outline-none text-sm py-2 ${isDark ? 'border-white/10' : 'border-gray-200 focus:border-[#FFC928]'}`}
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="text-[#FFC928] hover:scale-110 transition-transform disabled:opacity-50"
                  >
                    {loading ? <Loader2 size={20} className="animate-spin" /> : <ArrowRight size={20} />}
                  </button>
                </div>
              )}
              <p className="text-[8px] mt-3 opacity-40 leading-tight uppercase font-black">
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
