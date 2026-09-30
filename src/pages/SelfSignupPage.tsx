import { useState, useEffect, useRef } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword, updateProfile, sendEmailVerification } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth } from '../lib/firebase-auth';
import { db } from '../lib/firebase';
import { toast } from 'react-hot-toast';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { Button } from '../components/Button';
import BackButton from '../components/BackButton';
import Navbar from '../components/Navbar';
import Footer from '../components/Footer';
import SEO from '../components/SEO';
import { trackEvent } from '../lib/analytics';
import { useTranslation } from 'react-i18next';
import { getFirebaseErrorMessage } from '../lib/utils';

export default function SelfSignupPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(0);
  const [form, setForm] = useState({ name: '', whatsapp: '', email: '', password: '' });
  const [created, setCreated] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const mountedRef = useRef(true);
  const submittingRef = useRef(false);

  useEffect(() => {
    if (auth.currentUser) {
      navigate('/busca', { replace: true });
    }
  }, [navigate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const update = (field: string, value: string) => setForm(f => ({ ...f, [field]: value }));

  const maskPhone = (value: string) => {
    const digits = value.replace(/\D/g, '').slice(0, 11);
    if (digits.length <= 2) return `(${digits}`;
    if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`;
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`;
  };

  const valid = {
    name: form.name.trim().length >= 2,
    whatsapp: form.whatsapp.replace(/\D/g, '').length >= 10,
    email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email),
    password: form.password.length >= 6,
  };

  const canSubmit = valid.name && valid.whatsapp && valid.email && valid.password && lgpdConsent;

  const handleSubmit = async () => {
    if (!canSubmit || loading || submittingRef.current) return;
    if (auth.currentUser) {
      toast.error(t('signup.alreadyLogged'));
      navigate('/busca', { replace: true });
      return;
    }
    submittingRef.current = true;
    setLoading(true);
    try {
      const whatsappClean = form.whatsapp.replace(/\D/g, '');

      const cred = await createUserWithEmailAndPassword(auth, form.email, form.password);
      await updateProfile(cred.user, { displayName: form.name });

      await setDoc(doc(db, 'users', cred.user.uid), {
        full_name: form.name,
        whatsapp: whatsappClean || null,
        role: 'customer',
        createdAt: new Date().toISOString(),
        onboardingComplete: false,
        signupIntent: 'restaurant',
      }, { merge: true });

      try {
        await sendEmailVerification(cred.user);
      } catch (verifyErr) {
        console.error('[Signup] Failed to send verification email:', verifyErr);
      }

      if (!mountedRef.current) return;

      setCreated(true);
      setStep(2);
      trackEvent('sign_up', { method: 'email', role: 'customer' });
      toast.success(t('signup.createdOk'));

      setTimeout(() => {
        if (mountedRef.current) {
          navigate('/cadastro-restaurante');
        }
      }, 1500);
    } catch (err: any) {
      if (!mountedRef.current) return;
      toast.error(getFirebaseErrorMessage(err) || t('signup.createError'));
    } finally {
      submittingRef.current = false;
      if (mountedRef.current) setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] font-sans">
      <SEO title={t('signup.seoTitle')} description={t('signup.seoDesc')} />
      <Navbar />

      <div className="px-6 pt-6">
        <BackButton />
      </div>

      <div className="flex items-center justify-center px-4 py-24">
        <div className="w-full max-w-md">
          {step === 0 && (
            <div className="space-y-8">
              <div className="text-center space-y-3">
                <h1 className="text-4xl font-black text-white uppercase italic tracking-tighter">
                  {t('signup.titleA')} <span className="text-[#FFC928]">{t('signup.titleB')}</span>
                </h1>
                <p className="text-gray-400 font-medium text-sm">
                  {t('signup.tagline')}
                </p>
              </div>

              <form onSubmit={e => { e.preventDefault(); handleSubmit(); }} className="bg-[#111] border border-white/5 rounded-3xl p-6 space-y-5">
                <div>
                  <label htmlFor="signup-name" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('signup.nameLabel')}</label>
                  <input
                    id="signup-name"
                    autoFocus
                    autoComplete="organization"
                    value={form.name}
                    onChange={e => update('name', e.target.value)}
                     placeholder={t('signup.namePlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.name.length > 0 && !valid.name}
                  />
                  {form.name.length > 0 && !valid.name && (
                     <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">{t('signup.nameError')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="signup-whatsapp" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('signup.waLabel')}</label>
                  <input
                    id="signup-whatsapp"
                    inputMode="tel"
                    autoComplete="tel"
                    value={form.whatsapp}
                    onChange={e => update('whatsapp', maskPhone(e.target.value))}
                    placeholder="(11) 99999-9999"
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.whatsapp.length > 0 && !valid.whatsapp}
                  />
                  {form.whatsapp.length > 0 && !valid.whatsapp && (
                     <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">{t('signup.waError')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="signup-email" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('signup.emailLabel')}</label>
                  <input
                    id="signup-email"
                    type="email"
                    autoComplete="email"
                    value={form.email}
                    onChange={e => update('email', e.target.value)}
                     placeholder={t('signup.emailPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.email.length > 0 && !valid.email}
                  />
                  {form.email.length > 0 && !valid.email && (
                     <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">{t('signup.emailError')}</p>
                  )}
                </div>
                <div>
                  <label htmlFor="signup-password" className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-2">{t('signup.passLabel')}</label>
                  <input
                    id="signup-password"
                    type="password"
                    autoComplete="new-password"
                    minLength={6}
                    value={form.password}
                    onChange={e => update('password', e.target.value)}
                     placeholder={t('signup.passPlaceholder')}
                    className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white text-sm font-bold placeholder:text-gray-600 focus:outline-none focus:border-[#FFC928] transition-colors"
                    aria-required="true"
                    aria-invalid={form.password.length > 0 && !valid.password}
                  />
                  {form.password.length > 0 && !valid.password && (
                     <p className="text-red-400 text-[10px] font-bold mt-1" role="alert">{t('signup.passError')}</p>
                  )}
                </div>

                <label className="flex items-start gap-3 cursor-pointer group">
                  <input
                    type="checkbox"
                    id="signup-lgpd"
                    checked={lgpdConsent}
                    onChange={e => setLgpdConsent(e.target.checked)}
                    required
                    className="mt-0.5 w-5 h-5 rounded border-white/20 bg-white/5 text-[#FFC928] accent-[#FFC928] shrink-0"
                    aria-required="true"
                  />
                  <span className="text-[10px] font-bold text-gray-400 leading-relaxed">
                    {t('login.lgpdAccept')}{' '}
                    <Link to="/termos" className="text-[#FFC928] hover:underline">{t('login.terms')}</Link>
                    {' '}{t('login.lgpdAnd')}{' '}
                    <Link to="/privacidade" className="text-[#FFC928] hover:underline">{t('login.privacy')}</Link>
                    {t('login.lgpdTail')}
                  </span>
                </label>

                <Button
                  type="submit"
                  size="lg"
                  disabled={!canSubmit || loading}
                  isLoading={loading}
                  className="w-full"
                >
                  <Check size={16} /> {t('signup.submitBtn')}
                </Button>

                <p className="text-center text-[10px] text-gray-500 font-bold">
                  {t('signup.hasAccount')}{' '}
                  <Link to="/login" className="text-[#FFC928] hover:underline">{t('signup.loginLink')}</Link>
                </p>
              </form>

              <div className="grid grid-cols-3 gap-3 text-center">
                {[t('signup.perk1'), t('signup.perk2'), t('signup.perk3')].map((item, i) => (
                  <div key={i} className="bg-white/5 border border-white/5 rounded-2xl p-3">
                    <Check size={14} className="text-emerald-400 mx-auto mb-1" />
                    <span className="text-[9px] font-black text-gray-400 uppercase tracking-wider">{item}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {step === 1 && (
            <div className="text-center space-y-6 py-12" role="status" aria-live="polite">
              <Loader2 size={40} className="animate-spin text-[#FFC928] mx-auto" aria-hidden="true" />
              <p className="text-white font-bold text-lg">{t('signup.creating')}</p>
              <p className="text-gray-400 text-sm">{t('signup.moment')}</p>
            </div>
          )}

          {step === 2 && (
            <div className="text-center space-y-6 py-12" role="alert" aria-live="assertive">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <Check size={32} className="text-emerald-400" />
              </div>
              <h2 className="text-2xl font-black text-white">{t('signup.createdTitle')}</h2>
              <p className="text-gray-400 text-sm">{t('signup.createdDesc')}</p>
            </div>
          )}
        </div>
      </div>

      <Footer />
    </div>
  );
}
