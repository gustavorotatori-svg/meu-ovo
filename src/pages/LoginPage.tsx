import { useState, useCallback, useRef, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader, Store, Utensils } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useTranslation } from 'react-i18next';
import { toast } from 'react-hot-toast';
import BackButton from '../components/BackButton';
import { Logo } from '../components/Logo';
import SEO from '../components/SEO';
import { auth } from '../lib/firebase-auth';
import { db } from '../lib/firebase';
import { doc, getDoc, getDocs, collection, query, where, limit, updateDoc } from 'firebase/firestore';
import { sendEmailVerification } from 'firebase/auth';
import { getFirebaseErrorMessage } from '../lib/utils';
import { trackEvent } from '../lib/analytics';
import { Button } from '../components/Button';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RoleTab = 'customer' | 'restaurant';

export default function LoginPage() {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '';
  const safeRedirect = redirectTo.startsWith('/') && !redirectTo.startsWith('//') ? redirectTo : '';
  const isRestaurantRedirect = redirectTo === '/cadastro-restaurante' || redirectTo === '/admin' || redirectTo.startsWith('/admin/');
  const initialTab: RoleTab = isRestaurantRedirect ? 'restaurant' : 'customer';
  const [roleTab, setRoleTab] = useState<RoleTab>(initialTab);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const submittingRef = useRef(false);
  const isRestaurant = roleTab === 'restaurant';

  const resolvePostLoginDestination = async (): Promise<string> => {
    if (safeRedirect) return safeRedirect;
    const uid = auth.currentUser?.uid || '';
    try {
      const userDoc = await getDoc(doc(db, 'users', uid));
      const data = userDoc.exists() ? userDoc.data() : null;
      const role = data?.role || 'customer';
      if (role === 'restaurant') return '/admin';
      if (role === 'admin') return '/plataforma';
      const resumingOnboarding = data?.signupIntent === 'restaurant' && !data?.onboardingComplete;
      if (resumingOnboarding) return '/cadastro-restaurante';
      const owned = await getDocs(query(collection(db, 'restaurants'), where('ownerId', '==', uid), limit(1)));
      if (!owned.empty) return '/cadastro-restaurante';
    } catch {
      // fallthrough — keep safe defaults below
    }
    return isRestaurant ? '/admin' : '/busca';
  };

  const handleGoogleSignIn = useCallback(async () => {
    if (!isLogin && !lgpdConsent) {
      toast.error(t('login.lgpdRequired'));
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success(t('login.welcome'));
      navigate(await resolvePostLoginDestination());
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
    }, [signInWithGoogle, navigate, safeRedirect, isLogin, lgpdConsent, t]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const errors = { name: '', email: '', password: '' };
    let valid = true;

    if (!isLogin && !formData.name.trim()) {
      errors.name = isRestaurant ? t('login.nameRequiredRestaurant') : t('login.nameRequired');
      valid = false;
    }

    if (!formData.email.trim()) {
      errors.email = t('login.emailRequired');
      valid = false;
    } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
      errors.email = t('login.emailInvalid');
      valid = false;
    }

    if (!formData.password) {
      errors.password = t('login.passwordRequired');
      valid = false;
    } else if (formData.password.length < 6) {
      errors.password = t('login.passwordMinError');
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) { toast.error(t('login.forgotEmailFirst')); return; }
    if (!EMAIL_PATTERN.test(formData.email.trim())) { toast.error(t('login.emailInvalidShort')); return; }
    setResetting(true);
    try {
      await resetPassword(formData.email);
      toast.success(t('login.resetSent'));
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (submittingRef.current) return;
    if (!validate()) return;
    submittingRef.current = true;
    setLoading(true);
    try {
      if (isLogin) {
        try {
          await signIn(formData.email.trim(), formData.password);
        } catch (signInErr: unknown) {
          if (signInErr instanceof Error && signInErr.message === 'EMAIL_NOT_VERIFIED') {
            toast.error(t('login.emailNotVerified'));
            try { await auth.currentUser?.reload(); } catch {}
            if (auth.currentUser && !auth.currentUser.emailVerified) {
              if (auth.currentUser) await sendEmailVerification(auth.currentUser);
              toast.success(t('login.verificationResent'));
            }
            setLoading(false);
            return;
          }
          throw signInErr;
        }
        toast.success(t('login.welcomeBack'));
        navigate(await resolvePostLoginDestination());
      } else {
        if (!lgpdConsent) { toast.error(t('login.lgpdRequired')); setLoading(false); return; }
        const role = isRestaurant ? 'restaurant' : 'customer';
        await signUp(formData.email.trim(), formData.password, formData.name.trim(), role);
        trackEvent('sign_up', { method: 'email', role });
        if (isRestaurant) {
          try { await updateDoc(doc(db, 'users', auth.currentUser?.uid || ''), { signupIntent: 'restaurant' }); } catch {}
          toast.success(t('login.restaurantCreated'));
          navigate('/cadastro-restaurante');
        } else {
          toast.success(t('login.accountCreated'));
          const next = safeRedirect || '/busca';
          navigate(`/install-app?next=${encodeURIComponent(next)}`);
        }
      }
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      submittingRef.current = false;
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E1] to-white flex items-center justify-center p-6">
      <SEO title={isRestaurant ? t('login.seoTitleRestaurant') : t('login.seoTitle')} description={t('login.seoDesc')} url="/login" />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <Logo size="lg" variant="colored" />
          </Link>

          {/* Tabs: Cliente / Restaurante */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 max-w-xs mx-auto" role="tablist" aria-label={t('login.tabListLabel')}>
            <button
              role="tab"
              aria-selected={roleTab === 'customer'}
              onClick={() => { setRoleTab('customer'); setIsLogin(true); setLgpdConsent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${roleTab === 'customer' ? 'bg-white text-[#111] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Utensils size={16} /> {t('login.tabCustomer')}
            </button>
            <button
              role="tab"
              aria-selected={roleTab === 'restaurant'}
              onClick={() => { setRoleTab('restaurant'); setIsLogin(true); setLgpdConsent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${roleTab === 'restaurant' ? 'bg-[#FFC928] text-[#111] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Store size={16} /> {t('login.tabRestaurant')}
            </button>
          </div>

          {isRestaurant ? (
            <div className="bg-[#111] border border-[#FFC928]/30 rounded-xl p-5 text-left mb-6">
              <p className="text-sm font-black text-[#FFC928] mb-1">🍳 {t('login.restaurantPromoTitle')}</p>
              <p className="text-[11px] text-gray-300 leading-relaxed">
                {t('login.restaurantPromoDesc')}
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-6">
              {t('login.customerTagline')}
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-8 space-y-5 border border-gray-100">
          {!isLogin && (
            <>
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border-2 border-gray-200 text-gray-700 font-black py-4 rounded-xl hover:bg-gray-50 hover:border-[#FFC928] hover:text-[#111] transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            {isRestaurant ? t('login.googleSignupRestaurant') : t('login.googleSignupCustomer')}
          </button>

          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('login.orSignupEmail')}</span></div>
          </div>
            </>
          )}

          {!isLogin && (
            <div className="space-y-1.5">
              <label htmlFor="login-name" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isRestaurant ? t('login.nameResponsible') : t('login.nameFull')}</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" aria-hidden="true" />
                <input
                  id="login-name"
                  type="text"
                  name="name"
                  autoFocus={!isLogin}
                  autoComplete="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={isRestaurant ? t('login.namePlaceholderRestaurant') : t('login.namePlaceholder')}
                  aria-required={!isLogin}
                  aria-invalid={!!fieldErrors.name}
                  aria-describedby={fieldErrors.name ? 'login-name-error' : undefined}
                  className={`w-full border bg-slate-50/50 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:outline-none focus:bg-white transition-all ${fieldErrors.name ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#FFC928]'}`}
                />
              </div>
              {fieldErrors.name && <p id="login-name-error" className="text-red-500 text-[10px] font-bold ml-1" role="alert">{fieldErrors.name}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <label htmlFor="login-email" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('login.emailLabel')}</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" aria-hidden="true" />
              <input
                id="login-email"
                type="email"
                name="email"
                autoFocus={isLogin}
                autoComplete="email"
                value={formData.email}
                onChange={handleChange}
                placeholder={t('login.emailPlaceholder')}
                required
                aria-required="true"
                aria-invalid={!!fieldErrors.email}
                aria-describedby={fieldErrors.email ? 'login-email-error' : undefined}
                className={`w-full border bg-slate-50/50 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:outline-none focus:bg-white transition-all ${fieldErrors.email ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#FFC928]'}`}
              />
            </div>
            {fieldErrors.email && <p id="login-email-error" className="text-red-500 text-[10px] font-bold ml-1" role="alert">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label htmlFor="login-password" className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{t('login.passwordLabel')}</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" aria-hidden="true" />
              <input
                id="login-password"
                type={showPassword ? 'text' : 'password'}
                name="password"
                autoComplete={isLogin ? 'current-password' : 'new-password'}
                value={formData.password}
                onChange={handleChange}
                placeholder={isLogin ? t('login.passwordPlaceholderLogin') : t('login.passwordPlaceholderSignup')}
                required
                minLength={6}
                aria-required="true"
                aria-invalid={!!fieldErrors.password}
                aria-describedby={fieldErrors.password ? 'login-password-error' : undefined}
                className={`w-full border bg-slate-50/50 rounded-xl pl-11 pr-11 py-3 text-sm font-bold focus:outline-none focus:bg-white transition-all ${fieldErrors.password ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#FFC928]'}`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? t('login.hidePassword') : t('login.showPassword')} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 hover:text-gray-500">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p id="login-password-error" className="text-red-500 text-[10px] font-bold ml-1" role="alert">{fieldErrors.password}</p>}
            {!isLogin && !fieldErrors.password && formData.password.length > 0 && (
              <div className="flex gap-1 ml-1 mt-1" aria-live="polite">
                <span className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${formData.password.length >= 6 ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                  {formData.password.length >= 6 ? t('login.passwordOk') : t('login.passwordMin')}
                </span>
              </div>
            )}
          </div>

          {isLogin && (
              <button type="button" onClick={handleForgotPassword} disabled={resetting} className="block py-3 text-[10px] font-black text-[#FFC928] hover:text-[#e6b520] uppercase tracking-widest transition-colors disabled:opacity-40 flex items-center gap-1">
              {resetting && <Loader size={12} className="animate-spin" />}
              {resetting ? t('login.sending') : t('login.forgotPassword')}
            </button>
          )}

          {!isLogin && (
            <label className="flex items-start gap-3 cursor-pointer group">
              <input
                type="checkbox"
                checked={lgpdConsent}
                onChange={e => setLgpdConsent(e.target.checked)}
                required
                className="mt-0.5 w-5 h-5 rounded border-gray-300 text-[#FFC928] focus:ring-[#FFC928] shrink-0"
              />
              <span className="text-[10px] font-bold text-gray-500 leading-relaxed">
                {t('login.lgpdAccept')}{' '}
                <Link to="/termos" className="text-[#FFC928] hover:underline">{t('login.terms')}</Link>
                {' '}{t('login.lgpdAnd')}{' '}
                <Link to="/privacidade" className="text-[#FFC928] hover:underline">{t('login.privacy')}</Link>
                {t('login.lgpdTail')}
              </span>
            </label>
          )}

          <Button
            type="submit"
            variant="secondary"
            size="lg"
            disabled={loading}
            isLoading={loading}
            className="w-full rounded-xl"
          >
            {loading ? t('login.submitWait') : isLogin ? (isRestaurant ? t('login.submitLoginRestaurant') : t('login.submitLogin')) : (isRestaurant ? t('login.submitSignupRestaurant') : t('login.submitSignup'))}
          </Button>

          {isLogin && (
          <>
          <div className="relative">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">{t('login.orLoginWith')}</span></div>
          </div>

          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={loading}
            className="w-full bg-white border border-gray-200 text-gray-700 font-black py-4 rounded-xl hover:bg-gray-50 hover:border-gray-300 transition-all text-sm uppercase tracking-widest flex items-center justify-center gap-3"
          >
            <svg viewBox="0 0 24 24" className="w-5 h-5"><path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z"/><path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/><path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/><path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/></svg>
            Google
          </button>
          </>
          )}
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => { setIsLogin(!isLogin); setLgpdConsent(false); }}
            className="text-sm font-bold text-gray-400 hover:text-[#111] transition-colors"
          >
            {isLogin ? (isRestaurant ? t('login.switchToSignupRestaurant') : t('login.switchToSignup')) : t('login.switchToLogin')}
          </button>
        </div>

        <div className="flex justify-center mt-6">
          <BackButton />
        </div>
      </div>
    </div>
  );
}
