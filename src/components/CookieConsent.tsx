import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';

const COOKIE_CONSENT_KEY = '@meuovo:cookie-consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const stored = localStorage.getItem(COOKIE_CONSENT_KEY);
    if (!stored) {
      const timer = setTimeout(() => setVisible(true), 1000);
      return () => clearTimeout(timer);
    }
  }, []);

  const accept = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: true, at: new Date().toISOString() }));
    setVisible(false);
  };

  const reject = () => {
    localStorage.setItem(COOKIE_CONSENT_KEY, JSON.stringify({ accepted: false, at: new Date().toISOString() }));
    setVisible(false);
  };

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#111] border-t border-amber-500/20 shadow-2xl">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie size={24} className="text-[#FFC928] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300 leading-relaxed">
            Usamos cookies e tecnologias semelhantes para melhorar sua experiência, personalizar conteúdo e analisar tráfego. 
            Ao continuar navegando, você concorda com nossa{' '}
            <Link to="/privacidade" className="text-[#FFC928] underline hover:no-underline font-bold">Política de Privacidade</Link>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={reject}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all"
          >
            Recusar
          </button>
          <button
            onClick={accept}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-[#FFC928] text-black hover:bg-amber-400 transition-all"
          >
            Aceitar
          </button>
          <button
            onClick={reject}
            className="text-gray-500 hover:text-white transition-colors p-1"
            aria-label="Fechar"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </div>
  );
}
