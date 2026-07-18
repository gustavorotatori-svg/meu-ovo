import { useState, useCallback, type ChangeEvent, type FormEvent } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Mail, Lock, User, Eye, EyeOff, Loader, Store, Utensils } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { toast } from 'react-hot-toast';
import BackButton from '../components/BackButton';
import { Logo } from '../components/Logo';
import SEO from '../components/SEO';
import { auth } from '../lib/firebase-auth';
import { getFirebaseErrorMessage } from '../lib/utils';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

type RoleTab = 'customer' | 'restaurant';

export default function LoginPage() {
  const navigate = useNavigate();
  const { signIn, signUp, signInWithGoogle, resetPassword } = useAuth();
  const redirectTo = new URLSearchParams(window.location.search).get('redirect') || '';
  const initialTab: RoleTab = redirectTo === '/cadastro-restaurante' ? 'restaurant' : 'customer';
  const [roleTab, setRoleTab] = useState<RoleTab>(initialTab);
  const [isLogin, setIsLogin] = useState(true);
  const [loading, setLoading] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [lgpdConsent, setLgpdConsent] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', password: '' });
  const [fieldErrors, setFieldErrors] = useState({ name: '', email: '', password: '' });
  const isRestaurant = roleTab === 'restaurant';

  const handleGoogleSignIn = useCallback(async () => {
    if (!isLogin && !lgpdConsent) {
      toast.error('Você precisa aceitar os termos de privacidade');
      return;
    }
    setLoading(true);
    try {
      await signInWithGoogle();
      toast.success('Bem-vindo!');
      navigate(redirectTo || '/busca');
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }, [signInWithGoogle, navigate, redirectTo, isLogin, lgpdConsent]);

  const handleChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setFieldErrors(prev => ({ ...prev, [name]: '' }));
  };

  const validate = (): boolean => {
    const errors = { name: '', email: '', password: '' };
    let valid = true;

    if (!isLogin && !formData.name.trim()) {
      errors.name = isRestaurant ? 'Digite o nome do responsável' : 'Digite seu nome';
      valid = false;
    }

    if (!formData.email.trim()) {
      errors.email = 'Digite seu e-mail';
      valid = false;
    } else if (!EMAIL_PATTERN.test(formData.email.trim())) {
      errors.email = 'E-mail inválido. Use o formato: nome@provedor.com';
      valid = false;
    }

    if (!formData.password) {
      errors.password = 'Digite sua senha';
      valid = false;
    } else if (formData.password.length < 6) {
      errors.password = 'A senha deve ter no mínimo 6 caracteres';
      valid = false;
    } else if (!isLogin && !/[A-Za-z]/.test(formData.password)) {
      errors.password = 'A senha deve conter pelo menos uma letra';
      valid = false;
    } else if (!isLogin && !/[0-9]/.test(formData.password)) {
      errors.password = 'A senha deve conter pelo menos um número';
      valid = false;
    }

    setFieldErrors(errors);
    return valid;
  };

  const handleForgotPassword = async () => {
    if (!formData.email.trim()) { toast.error('Digite seu e-mail primeiro'); return; }
    if (!EMAIL_PATTERN.test(formData.email.trim())) { toast.error('E-mail inválido'); return; }
    setResetting(true);
    try {
      await resetPassword(formData.email);
      toast.success('E-mail de recuperação enviado! Verifique sua caixa de entrada.');
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setResetting(false);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validate()) return;
    setLoading(true);
    try {
      if (isLogin) {
        await signIn(formData.email.trim(), formData.password);
        toast.success('Bem-vindo de volta!');
        if (!isRestaurant && !auth.currentUser?.emailVerified) {
          toast('Verifique seu email antes de fazer pedidos', { icon: '✉️' });
        }
        navigate(redirectTo || (isRestaurant ? '/cadastro-restaurante' : '/busca'));
      } else {
        if (!lgpdConsent) { toast.error('Você precisa aceitar os termos de privacidade'); setLoading(false); return; }
        const role = isRestaurant ? 'restaurant' : 'customer';
        await signUp(formData.email.trim(), formData.password, formData.name.trim(), role);
        if (isRestaurant) {
          toast.success('Conta de restaurante criada! Agora cadastre seu cardápio.');
          navigate('/cadastro-restaurante');
        } else {
          toast.success('Conta criada! Verifique seu email.');
          const next = redirectTo || '/busca';
          navigate(`/install-app?next=${encodeURIComponent(next)}`);
        }
      }
    } catch (error) {
      toast.error(getFirebaseErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#FFF8E1] to-white flex items-center justify-center p-6">
      <SEO title={isRestaurant ? 'Para Restaurantes' : 'Entrar'} description="Crie sua conta no MEU OVO e peça comida dos melhores restaurantes do bairro." url="/login" />
      <div className="w-full max-w-md">
        <div className="text-center mb-6">
          <Link to="/" className="inline-block mb-4">
            <Logo size="lg" variant="colored" />
          </Link>

          {/* Tabs: Cliente / Restaurante */}
          <div className="flex bg-gray-100 rounded-2xl p-1 mb-6 max-w-xs mx-auto" role="tablist" aria-label="Tipo de cadastro">
            <button
              role="tab"
              aria-selected={roleTab === 'customer'}
              onClick={() => { setRoleTab('customer'); setIsLogin(true); setLgpdConsent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${roleTab === 'customer' ? 'bg-white text-[#111] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Utensils size={16} /> Cliente
            </button>
            <button
              role="tab"
              aria-selected={roleTab === 'restaurant'}
              onClick={() => { setRoleTab('restaurant'); setIsLogin(true); setLgpdConsent(false); }}
              className={`flex-1 flex items-center justify-center gap-2 py-3 min-h-[44px] rounded-xl text-[11px] font-black uppercase tracking-wider transition-all ${roleTab === 'restaurant' ? 'bg-[#FFC928] text-[#111] shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
            >
              <Store size={16} /> Restaurante
            </button>
          </div>

          {isRestaurant ? (
            <div className="bg-[#FFF8E1] border border-[#FFC928]/30 rounded-xl p-4 text-left mb-6">
              <p className="text-xs font-black text-[#111] mb-1">🍳 Área do Restaurante</p>
              <p className="text-[10px] text-gray-500 leading-relaxed">
                Crie sua conta para cadastrar seu cardápio digital grátis, receber pedidos direto no WhatsApp e vender sem taxa.
              </p>
            </div>
          ) : (
            <p className="text-sm text-gray-500 mb-6">
              Peça comida dos melhores restaurantes do bairro, direto, sem taxa.
            </p>
          )}
        </div>

        <form onSubmit={handleSubmit} className="bg-white rounded-[2rem] shadow-xl shadow-black/5 p-8 space-y-5 border border-gray-100">
          {!isLogin && (
            <div className="space-y-1.5">
              <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">{isRestaurant ? 'Responsável' : 'Nome completo'}</label>
              <div className="relative">
                <User size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleChange}
                  placeholder={isRestaurant ? 'Seu nome (responsável)' : 'Seu nome'}
                  className={`w-full border bg-slate-50/50 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:outline-none focus:bg-white transition-all ${fieldErrors.name ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#FFC928]'}`}
                />
              </div>
              {fieldErrors.name && <p className="text-red-500 text-[10px] font-bold ml-1">{fieldErrors.name}</p>}
            </div>
          )}

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">E-mail</label>
            <div className="relative">
              <Mail size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                placeholder="seu@email.com"
                required
                className={`w-full border bg-slate-50/50 rounded-xl pl-11 pr-4 py-3 text-sm font-bold focus:outline-none focus:bg-white transition-all ${fieldErrors.email ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#FFC928]'}`}
              />
            </div>
            {fieldErrors.email && <p className="text-red-500 text-[10px] font-bold ml-1">{fieldErrors.email}</p>}
          </div>

          <div className="space-y-1.5">
            <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest ml-1">Senha</label>
            <div className="relative">
              <Lock size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-300" />
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                placeholder={isLogin ? 'Sua senha' : 'Mínimo 6 caracteres, 1 letra e 1 número'}
                required
                minLength={6}
                className={`w-full border bg-slate-50/50 rounded-xl pl-11 pr-11 py-3 text-sm font-bold focus:outline-none focus:bg-white transition-all ${fieldErrors.password ? 'border-red-300 focus:border-red-400' : 'border-gray-100 focus:border-[#FFC928]'}`}
              />
              <button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'} className="absolute right-4 top-1/2 -translate-y-1/2 p-3 text-gray-300 hover:text-gray-500">
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
            {fieldErrors.password && <p className="text-red-500 text-[10px] font-bold ml-1">{fieldErrors.password}</p>}
            {!isLogin && !fieldErrors.password && formData.password.length > 0 && (
              <div className="flex gap-1 ml-1 mt-1">
                {[
                  { label: '6+', ok: formData.password.length >= 6 },
                  { label: 'Letra', ok: /[A-Za-z]/.test(formData.password) },
                  { label: 'Número', ok: /[0-9]/.test(formData.password) },
                ].map(req => (
                  <span key={req.label} className={`text-[9px] font-black uppercase tracking-wider px-1.5 py-0.5 rounded ${req.ok ? 'bg-emerald-100 text-emerald-700' : 'bg-gray-100 text-gray-400'}`}>
                    {req.label}
                  </span>
                ))}
              </div>
            )}
          </div>

          {isLogin && (
              <button type="button" onClick={handleForgotPassword} disabled={resetting} className="block py-3 text-[10px] font-black text-[#FFC928] hover:text-[#e6b520] uppercase tracking-widest transition-colors disabled:opacity-40 flex items-center gap-1">
              {resetting && <Loader size={12} className="animate-spin" />}
              {resetting ? 'Enviando...' : 'Esqueci minha senha'}
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
                Aceito os{' '}
                <Link to="/termos" className="text-[#FFC928] hover:underline">Termos de Uso</Link>
                {' '}e a{' '}
                <Link to="/privacidade" className="text-[#FFC928] hover:underline">Política de Privacidade</Link>
                , e autorizo o tratamento dos meus dados conforme a LGPD.
              </span>
            </label>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-[#111] text-white font-black py-4 rounded-xl hover:bg-black transition-all text-sm uppercase tracking-widest disabled:opacity-40 flex items-center justify-center gap-2"
          >
            {loading ? <Loader size={16} className="animate-spin" /> : null}
            {loading ? 'Aguarde...' : isLogin ? (isRestaurant ? 'Entrar como restaurante' : 'Entrar') : (isRestaurant ? 'Criar conta de restaurante' : 'Criar conta')}
          </button>

          <div className="relative my-6">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-gray-200" /></div>
            <div className="relative flex justify-center"><span className="bg-white px-4 text-[10px] font-black text-gray-400 uppercase tracking-widest">ou continue com</span></div>
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
        </form>

        <div className="text-center mt-6">
          <button
            onClick={() => { setIsLogin(!isLogin); setLgpdConsent(false); }}
            className="text-sm font-bold text-gray-400 hover:text-[#111] transition-colors"
          >
            {isLogin ? (isRestaurant ? 'Novo no MEU OVO? Cadastre seu restaurante' : 'Não tem conta? Cadastre-se') : 'Já tem conta? Entre'}
          </button>
        </div>

        <div className="flex justify-center mt-6">
          <BackButton to="/" />
        </div>
      </div>
    </div>
  );
}
