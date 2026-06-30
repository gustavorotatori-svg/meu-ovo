import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, X, Download, Share2 } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function isMobile(): boolean {
  const ua = navigator.userAgent.toLowerCase();
  return /android|iphone|ipad|ipod/.test(ua);
}

function isIOS(): boolean {
  return /iphone|ipad|ipod/.test(navigator.userAgent.toLowerCase());
}

export default function PwaInstallPrompt() {
  const { theme } = useTheme();
  const isDark = theme === 'dark';
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setShowPrompt(true);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    if (dismissed || isStandalone() || !isMobile()) return;
    const timer = setTimeout(() => setShowPrompt(true), 4000);
    return () => clearTimeout(timer);
  }, [dismissed]);

  useEffect(() => {
    const handleAppInstalled = () => {
      setShowPrompt(false);
      setDeferredPrompt(null);
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => window.removeEventListener('appinstalled', handleAppInstalled);
  }, []);

  const handleInstall = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      if (result.outcome === 'accepted') setShowPrompt(false);
      setDeferredPrompt(null);
    }
    setDismissed(true);
    setShowPrompt(false);
  };

  const handleDismiss = () => {
    setDismissed(true);
    setShowPrompt(false);
  };

  const canNativeInstall = !!deferredPrompt;

  return (
    <AnimatePresence>
      {showPrompt && (
        <motion.div
          initial={{ opacity: 0, y: 100 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: 100 }}
          className={`fixed bottom-6 left-4 right-4 z-[60] max-w-md mx-auto rounded-2xl p-5 shadow-2xl border ${
            isDark ? 'bg-zinc-900 border-zinc-800' : 'bg-white border-gray-100'
          }`}
        >
          <button onClick={handleDismiss} aria-label="Fechar" className={`absolute top-3 right-3 p-2.5 rounded-full ${isDark ? 'hover:bg-zinc-800' : 'hover:bg-gray-100'}`}>
            <X size={16} className={isDark ? 'text-gray-400' : 'text-gray-500'} />
          </button>

          <div className="flex items-start gap-4">
            <div className={`p-3 rounded-xl shrink-0 ${isDark ? 'bg-zinc-800' : 'bg-amber-50'}`}>
              <Smartphone size={24} className="text-[#FFC928]" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className={`font-black text-sm uppercase tracking-tight ${isDark ? 'text-white' : 'text-[#111]'}`}>
                Instalar Meu Ovo
              </h3>
              <p className={`text-xs mt-1 leading-relaxed ${isDark ? 'text-gray-400' : 'text-gray-500'}`}>
                Adicione à tela inicial e acesse com 1 toque.
              </p>

              {canNativeInstall ? (
                <button
                  onClick={handleInstall}
                  className="mt-3 w-full bg-[#FFC928] text-black font-black py-3 px-4 rounded-xl text-xs uppercase tracking-wider hover:bg-[#e6b520] transition-all flex items-center justify-center gap-2"
                >
                  <Download size={16} />
                  Instalar Agora
                </button>
              ) : (
                <div className={`mt-3 p-3 rounded-xl space-y-2 ${isDark ? 'bg-zinc-950' : 'bg-gray-50'}`}>
                  {isIOS() ? (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC928] text-black font-black text-[10px]">1</span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Toque em <Share2 size={14} className="inline -mb-0.5" /> Compartilhar</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC928] text-black font-black text-[10px]">2</span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Role até "Adicionar à Tela de Início"</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC928] text-black font-black text-[10px]">3</span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Toque em "Adicionar" no canto superior</span>
                      </div>
                    </>
                  ) : (
                    <>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC928] text-black font-black text-[10px]">1</span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Toque no menu ⋮ do seu navegador</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC928] text-black font-black text-[10px]">2</span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Selecione "Adicionar à Tela Inicial"</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs">
                        <span className="flex items-center justify-center w-6 h-6 rounded-full bg-[#FFC928] text-black font-black text-[10px]">3</span>
                        <span className={isDark ? 'text-gray-300' : 'text-gray-700'}>Toque em "Adicionar"</span>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
