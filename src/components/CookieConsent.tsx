import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Cookie, X } from 'lucide-react';
import { getConsentState, hasConsentChoice, setConsent } from '../lib/consent';

export default function CookieConsent() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!hasConsentChoice()) {
      const timer = setTimeout(() => setVisible(true), 1000);
      const onOpen = () => setVisible(true);
      window.addEventListener('meuovo:open-consent', onOpen);
      return () => {
        clearTimeout(timer);
        window.removeEventListener('meuovo:open-consent', onOpen);
      };
    }
    const onOpen = () => setVisible(true);
    window.addEventListener('meuovo:open-consent', onOpen);
    return () => window.removeEventListener('meuovo:open-consent', onOpen);
  }, []);

  if (!visible) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[9999] bg-[#111] border-t border-amber-500/20 shadow-2xl" role="dialog" aria-live="polite" aria-label="Consentimento de cookies">
      <div className="max-w-5xl mx-auto px-4 py-4 flex flex-col sm:flex-row items-start sm:items-center gap-4">
        <div className="flex items-start gap-3 flex-1">
          <Cookie size={24} className="text-[#FFC928] shrink-0 mt-0.5" />
          <p className="text-xs text-gray-300 leading-relaxed">
            Valorizamos sua privacidade. Usamos cookies estritamente necessários para o funcionamento da plataforma e,
            com seu consentimento, ferramentas de análise de tráfego (como Google Analytics e Meta Pixel) para melhorar sua experiência.
            Você pode aceitar, recusar ou alterar sua escolha a qualquer momento em{' '}
            <Link to="/privacidade" onClick={() => setVisible(false)} className="text-[#FFC928] underline hover:no-underline font-bold">Política de Privacidade</Link>.
          </p>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => setConsent(false)}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl border border-gray-600 text-gray-300 hover:bg-gray-800 transition-all"
          >
            Recusar
          </button>
          <button
            onClick={() => setConsent(true)}
            className="text-[10px] font-black uppercase tracking-widest px-4 py-2 rounded-xl bg-[#FFC928] text-black hover:bg-amber-400 transition-all"
          >
            Aceitar
          </button>
          <button
            onClick={() => setVisible(false)}
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
