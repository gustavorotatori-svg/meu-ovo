import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Smartphone, Monitor, Download, Check, RefreshCw } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import { toast } from 'react-hot-toast';
import { useTranslation } from 'react-i18next';
import BackButton from '../components/BackButton';
import SEO from '../components/SEO';
import { Logo } from '../components/Logo';

type Platform = 'ios' | 'android' | 'windows' | 'mac' | 'linux' | 'unknown';
type Browser = 'chrome' | 'safari' | 'firefox' | 'edge' | 'samsung' | 'brave' | 'opera' | 'other';

interface Step {
  icon: string;
  text: string;
  detail: string;
}

function detectPlatform(): Platform {
  const ua = navigator.userAgent.toLowerCase();
  if (/iphone|ipad|ipod/.test(ua)) return 'ios';
  if (/android/.test(ua)) return 'android';
  if (/windows/.test(ua)) return 'windows';
  if (/mac/.test(ua)) return 'mac';
  if (/linux/.test(ua)) return 'linux';
  return 'unknown';
}

function detectBrowser(): Browser {
  const ua = navigator.userAgent.toLowerCase();
  if (ua.includes('samsung')) return 'samsung';
  if (ua.includes('edge') || ua.includes('edg/')) return 'edge';
  if (ua.includes('brave')) return 'brave';
  if (ua.includes('opera') || ua.includes('opr/')) return 'opera';
  if (ua.includes('chrome')) return 'chrome';
  if (ua.includes('safari')) return 'safari';
  if (ua.includes('firefox')) return 'firefox';
  return 'other';
}

function isStandalone(): boolean {
  return window.matchMedia('(display-mode: standalone)').matches
    || (window.navigator as Navigator & { standalone?: boolean }).standalone === true;
}

function getInstructions(t: (key: string) => string, platform: Platform, browser: Browser): Step[] {
  const isMobile = platform === 'ios' || platform === 'android';

  if (platform === 'ios') {
    return [
      { icon: '📤', text: t('installApp.ios1Text'), detail: t('installApp.ios1Detail') },
      { icon: '📲', text: t('installApp.ios2Text'), detail: t('installApp.ios2Detail') },
      { icon: '✅', text: t('installApp.ios3Text'), detail: t('installApp.ios3Detail') },
    ];
  }

  if (browser === 'samsung') {
    return [
      { icon: '☰', text: t('installApp.samsung1Text'), detail: t('installApp.samsung1Detail') },
      { icon: '📲', text: t('installApp.samsung2Text'), detail: t('installApp.samsung2Detail') },
      { icon: '🏠', text: t('installApp.samsung3Text'), detail: t('installApp.samsung3Detail') },
    ];
  }

  if (platform === 'android' && browser === 'chrome') {
    return [
      { icon: '⋮', text: t('installApp.android1Text'), detail: t('installApp.android1Detail') },
      { icon: '🏠', text: t('installApp.android2Text'), detail: t('installApp.android2Detail') },
      { icon: '✅', text: t('installApp.android3Text'), detail: t('installApp.android3Detail') },
    ];
  }

  if (browser === 'chrome' && !isMobile) {
    return [
      { icon: '⊞', text: t('installApp.chrome1Text'), detail: t('installApp.chrome1Detail') },
      { icon: '💻', text: t('installApp.chrome2Text'), detail: t('installApp.chrome2Detail') },
      { icon: '✅', text: t('installApp.chrome3Text'), detail: t('installApp.chrome3Detail') },
    ];
  }

  if (browser === 'edge') {
    return [
      { icon: '⋯', text: t('installApp.edge1Text'), detail: t('installApp.edge1Detail') },
      { icon: '📦', text: t('installApp.edge2Text'), detail: t('installApp.edge2Detail') },
      { icon: '✅', text: t('installApp.edge3Text'), detail: t('installApp.edge3Detail') },
    ];
  }

  if (browser === 'firefox' && !isMobile) {
    return [
      { icon: '☰', text: t('installApp.firefox1Text'), detail: t('installApp.firefox1Detail') },
      { icon: '📦', text: t('installApp.firefox2Text'), detail: t('installApp.firefox2Detail') },
      { icon: '✅', text: t('installApp.firefox3Text'), detail: t('installApp.firefox3Detail') },
    ];
  }

  if (browser === 'brave') {
    return [
      { icon: '☰', text: t('installApp.brave1Text'), detail: t('installApp.brave1Detail') },
      { icon: '📦', text: t('installApp.brave2Text'), detail: t('installApp.brave2Detail') },
      { icon: '✅', text: t('installApp.brave3Text'), detail: t('installApp.brave3Detail') },
    ];
  }

  if (browser === 'opera') {
    return [
      { icon: '☰', text: t('installApp.opera1Text'), detail: t('installApp.opera1Detail') },
      { icon: '📦', text: t('installApp.opera2Text'), detail: t('installApp.opera2Detail') },
      { icon: '✅', text: t('installApp.opera3Text'), detail: t('installApp.opera3Detail') },
    ];
  }

  // Fallback — genérico
  return [
    { icon: '📲', text: t('installApp.generic1Text'), detail: t('installApp.generic1Detail') },
    { icon: '🏠', text: isMobile ? t('installApp.generic2TextMobile') : t('installApp.generic2TextDesktop'), detail: t('installApp.generic2Detail') },
    { icon: '✅', text: isMobile ? t('installApp.generic3TextMobile') : t('installApp.generic3TextDesktop'), detail: t('installApp.generic3Detail') },
  ];
}

export default function InstallAppPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { user, isAuthenticated } = useAuth();
  const [platform, setPlatform] = useState<Platform>('unknown');
  const [browser, setBrowser] = useState<Browser>('other');
  const mountedRef = useRef(true);
  const [deferredPrompt, setDeferredPrompt] = useState<Event | null>(null);
  const [installing, setInstalling] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    setPlatform(detectPlatform());
    setBrowser(detectBrowser());

    if (isStandalone()) {
      doConfirm();
    }
  }, []);

  useEffect(() => {
    if (!isAuthenticated) { navigate('/login'); }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };
    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    const handleAppInstalled = () => {
      toast.success(t('installApp.installedToast'));
      doConfirm();
    };
    window.addEventListener('appinstalled', handleAppInstalled);
    return () => {
      window.removeEventListener('appinstalled', handleAppInstalled);
      mountedRef.current = false;
    };
  }, []);

  const doConfirm = async () => {
    if (!user) return;
    setConfirmed(true);
    try {
      await updateDoc(doc(db, 'users', user.id), { pwaInstallPending: false });
    } catch {
      // Non-critical — user still gets through
    }
    if (mountedRef.current) {
      const nextParam = new URLSearchParams(window.location.search).get('next');
      const safeNext = nextParam && nextParam.startsWith('/') && !nextParam.startsWith('//') ? nextParam : '';
      const destination = safeNext || (user?.role === 'restaurant' ? '/cadastro-restaurante' : '/busca');
      setTimeout(() => { if (mountedRef.current) navigate(destination); }, 1500);
    }
  };

  const handleSkip = () => {
    doConfirm();
  };

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      setInstalling(true);
      const promptEvent = deferredPrompt as Event & { prompt: () => void; userChoice: Promise<{ outcome: string }> };
      promptEvent.prompt();
      const result = await promptEvent.userChoice;
      if (result.outcome === 'accepted') {
        doConfirm();
      }
      setDeferredPrompt(null);
      setInstalling(false);
    }
  };

  const handleManualConfirm = () => {
    if (isStandalone()) {
      doConfirm();
    } else {
      toast((tt) => (
        <div className="flex flex-col gap-2">
          <p className="text-sm font-bold">{t('installApp.manualToastTitle')}</p>
          <p className="text-xs text-gray-500">{t('installApp.manualToastDesc')}</p>
          <button
            onClick={() => {
              if (isStandalone()) { doConfirm(); toast.dismiss(tt.id); }
              else { toast.error(t('installApp.manualToastError')); }
            }}
            className="mt-2 bg-[#FFC928] text-black font-black py-2 px-4 rounded-xl text-xs uppercase tracking-wider"
          >
            {t('installApp.manualToastBtn')}
          </button>
        </div>
      ), { duration: 8000 });
    }
  };

  const steps = getInstructions(t, platform, browser);
  const isMobile = platform === 'ios' || platform === 'android';
  const canNativeInstall = !!deferredPrompt && !isMobile;

  if (confirmed) {
    return (
      <div className="min-h-screen bg-gradient-to-b from-[#FFF8E1] to-white flex items-center justify-center p-6 install-app-page">
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="text-center"
        >
          <div className="w-20 h-20 bg-emerald-100 rounded-full flex items-center justify-center mx-auto mb-6">
            <Check size={40} className="text-emerald-500" />
          </div>
          <h2 className="text-2xl font-black text-[#111] mb-2">{t('installApp.successTitle')}</h2>
          <p className="text-gray-500">{t('installApp.redirecting')}</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E1] to-white install-app-page">
      <SEO title={t('installApp.seoTitle')} description={t('installApp.seoDesc')} url="/install-app" />
      <div className="max-w-lg mx-auto px-6 py-12">
        <div className="mb-6">
          <BackButton to="/" />
        </div>
        <div className="text-center mb-10">
          <motion.div
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            className="inline-block mb-6"
          >
            <Logo size="lg" variant="colored" />
          </motion.div>
          <motion.div
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="w-20 h-20 bg-[#FFC928] rounded-[2rem] flex items-center justify-center mx-auto mb-6 shadow-xl shadow-yellow-500/20"
          >
            {isMobile ? <Smartphone size={40} className="text-black" /> : <Monitor size={40} className="text-black" />}
          </motion.div>
          <motion.h1
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2 }}
            className="text-2xl font-black text-[#111] mb-3"
          >
            {isMobile ? t('installApp.titleMobile') : t('installApp.titleDesktop')}
          </motion.h1>
          <motion.p
            initial={{ y: -10, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm text-gray-500 leading-relaxed"
          >
            {t('installApp.subtitle')}
          </motion.p>
        </div>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-8 border border-gray-100"
        >
          <div className="text-center mb-6">
            <div className="inline-flex items-center gap-2 bg-[#FFC928]/10 text-[#FFC928] text-[10px] font-black px-3 py-1.5 rounded-full uppercase tracking-widest">
              {browser.charAt(0).toUpperCase() + browser.slice(1)} {platform === 'ios' ? 'iOS' : platform === 'android' ? 'Android' : platform === 'windows' ? 'Windows' : ''}
            </div>
          </div>

          <div className="space-y-4 mb-8">
            {steps.map((step, i) => (
              <motion.div
                key={i}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ delay: 0.5 + i * 0.15 }}
                className="flex items-start gap-4 p-4 rounded-xl bg-slate-50/80 border border-slate-100"
              >
                <div className="w-10 h-10 bg-[#FFC928] rounded-xl flex items-center justify-center text-lg shrink-0 shadow-sm">
                  {step.icon}
                </div>
                <div className="min-w-0">
                  <p className="font-black text-sm text-[#111]">
                    {i + 1}. {step.text}
                  </p>
                  <p className="text-[11px] text-gray-500 mt-1 leading-relaxed">
                    {step.detail}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>

          <AnimatePresence>
            {canNativeInstall && (
              <motion.div
                initial={{ y: 10, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                className="mb-4"
              >
                <button
                  onClick={handleInstallClick}
                  disabled={installing}
                  className="w-full bg-[#FFC928] text-black font-black py-4 rounded-xl text-sm uppercase tracking-widest hover:bg-[#e6b520] transition-all flex items-center justify-center gap-3 shadow-lg shadow-yellow-500/20"
                >
                  {installing ? <RefreshCw size={18} className="animate-spin" /> : <Download size={18} />}
                  {installing ? t('installApp.installing') : t('installApp.installNow')}
                </button>
              </motion.div>
            )}
          </AnimatePresence>

          <button
            onClick={handleManualConfirm}
            className="w-full bg-[#111] text-white font-black py-4 rounded-xl hover:bg-black transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
          >
            <Check size={18} />
            {t('installApp.manualConfirmBtn')}
          </button>

          <div className="mt-6 pt-6 border-t border-gray-100 text-center">
            <button
              onClick={handleSkip}
              className="text-[10px] font-black text-gray-400 hover:text-[#111] uppercase tracking-widest transition-colors"
            >
              {t('installApp.skipStep')}
            </button>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1 }}
          className="text-center mt-8"
        >
          <p className="text-[10px] text-gray-400 font-bold uppercase tracking-widest">
            {t('installApp.afterInstallHint')}
          </p>
          <p className="text-[9px] text-gray-300 mt-1">
            {isMobile ? t('installApp.homeScreen') : t('installApp.desktopScreen')}
          </p>
        </motion.div>
      </div>
    </div>
  );
}
